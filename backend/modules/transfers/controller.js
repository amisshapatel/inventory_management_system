import StockTransfer from './model.js';
import { adjustStock } from '../inventory/service.js';
import { generateTransferPDF } from '../../utils/pdfGenerator.js';
import { triggerEmailAlert } from '../notifications/service.js';
import mongoose from 'mongoose';

export const getTransfers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const count = await StockTransfer.countDocuments();
    const transfers = await StockTransfer.find()
      .populate('sourceWarehouseId', 'name code')
      .populate('destinationWarehouseId', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count,
      page,
      pages: Math.ceil(count / limit),
      data: transfers
    });
  } catch (error) {
    next(error);
  }
};

export const getTransferById = async (req, res, next) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('sourceWarehouseId', 'name code')
      .populate('destinationWarehouseId', 'name code')
      .populate('createdBy', 'name')
      .populate('items.productId', 'name sku unit');

    if (!transfer) {
      res.status(404);
      throw new Error('Stock transfer not found');
    }

    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (req, res, next) => {
  try {
    const { sourceWarehouseId, destinationWarehouseId, items, notes, status } = req.body;

    if (!sourceWarehouseId || !destinationWarehouseId || !items || items.length === 0) {
      res.status(400);
      throw new Error('Please provide source, destination and items list');
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      res.status(400);
      throw new Error('Source and destination warehouses cannot be the same');
    }

    // Generate unique transfer number (TRF-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const transferNumber = `TRF-${dateStr}-${rand}`;

    const transfer = new StockTransfer({
      transferNumber,
      sourceWarehouseId,
      destinationWarehouseId,
      items,
      notes,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    if (transfer.status === 'Completed') {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        transfer.completedAt = new Date();
        await transfer.save({ session });

        // Shift stock: subtract from source, add to destination
        for (const item of transfer.items) {
          // 1. Subtract from source
          await adjustStock({
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            quantityChange: -item.quantity,
            movementType: 'TRANSFER_OUT',
            reason: `Transfer stock: ${transfer.transferNumber}`,
            referenceType: 'Transfer',
            referenceId: transfer._id,
            referenceNumber: transfer.transferNumber,
            createdBy: req.user._id,
            session
          });

          // 2. Add to destination
          await adjustStock({
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            quantityChange: item.quantity,
            movementType: 'TRANSFER_IN',
            reason: `Transfer stock: ${transfer.transferNumber}`,
            referenceType: 'Transfer',
            referenceId: transfer._id,
            referenceNumber: transfer.transferNumber,
            createdBy: req.user._id,
            session
          });
        }

        // Fetch fully populated object to generate PDF
        const populatedTransfer = await StockTransfer.findById(transfer._id)
          .populate('sourceWarehouseId')
          .populate('destinationWarehouseId')
          .populate('items.productId')
          .session(session);

        const pdfRelativePath = await generateTransferPDF(populatedTransfer);
        transfer.pdfUrl = pdfRelativePath;
        await transfer.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Trigger email notification (outside session)
        triggerEmailAlert('stock_transfer', {
          transferNumber: populatedTransfer.transferNumber,
          sourceName: populatedTransfer.sourceWarehouseId.name,
          destinationName: populatedTransfer.destinationWarehouseId.name,
          totalItems: populatedTransfer.items.length
        }).catch(err => console.error('Error triggering transfer email:', err));

      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } else {
      await transfer.save();
    }

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};

export const updateTransferStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const transferId = req.params.id;

    if (!['Completed', 'Cancelled'].includes(status)) {
      res.status(400);
      throw new Error('Status must be Completed or Cancelled');
    }

    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) {
      res.status(404);
      throw new Error('Stock transfer not found');
    }

    if (transfer.status === status) {
      res.status(400);
      throw new Error(`Transfer is already in status '${status}'`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const previousStatus = transfer.status;
      transfer.status = status;

      if (status === 'Completed') {
        transfer.completedAt = new Date();
        await transfer.save({ session });

        // Process stock movements
        for (const item of transfer.items) {
          // 1. Subtract from source
          await adjustStock({
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            quantityChange: -item.quantity,
            movementType: 'TRANSFER_OUT',
            reason: `Transfer stock: ${transfer.transferNumber}`,
            referenceType: 'Transfer',
            referenceId: transfer._id,
            referenceNumber: transfer.transferNumber,
            createdBy: req.user._id,
            session
          });

          // 2. Add to destination
          await adjustStock({
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            quantityChange: item.quantity,
            movementType: 'TRANSFER_IN',
            reason: `Transfer stock: ${transfer.transferNumber}`,
            referenceType: 'Transfer',
            referenceId: transfer._id,
            referenceNumber: transfer.transferNumber,
            createdBy: req.user._id,
            session
          });
        }

        // Fetch fully populated to generate PDF
        const populatedTransfer = await StockTransfer.findById(transfer._id)
          .populate('sourceWarehouseId')
          .populate('destinationWarehouseId')
          .populate('items.productId')
          .session(session);

        const pdfRelativePath = await generateTransferPDF(populatedTransfer);
        transfer.pdfUrl = pdfRelativePath;
        await transfer.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Trigger email notification (outside session)
        triggerEmailAlert('stock_transfer', {
          transferNumber: populatedTransfer.transferNumber,
          sourceName: populatedTransfer.sourceWarehouseId.name,
          destinationName: populatedTransfer.destinationWarehouseId.name,
          totalItems: populatedTransfer.items.length
        }).catch(err => console.error('Error triggering transfer email:', err));

      } else if (status === 'Cancelled') {
        // Reverse if previously Completed
        if (previousStatus === 'Completed') {
          for (const item of transfer.items) {
            // Add back to source
            await adjustStock({
              productId: item.productId,
              warehouseId: transfer.sourceWarehouseId,
              quantityChange: item.quantity,
              movementType: 'ADJUSTMENT',
              reason: `Transfer cancelled: ${transfer.transferNumber}`,
              referenceType: 'Transfer',
              referenceId: transfer._id,
              referenceNumber: transfer.transferNumber,
              createdBy: req.user._id,
              session
            });

            // Subtract from destination
            await adjustStock({
              productId: item.productId,
              warehouseId: transfer.destinationWarehouseId,
              quantityChange: -item.quantity,
              movementType: 'ADJUSTMENT',
              reason: `Transfer cancelled: ${transfer.transferNumber}`,
              referenceType: 'Transfer',
              referenceId: transfer._id,
              referenceNumber: transfer.transferNumber,
              createdBy: req.user._id,
              session
            });
          }
        }
        await transfer.save({ session });
        await session.commitTransaction();
        session.endSession();
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};
