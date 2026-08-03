import SaleOrder from './model.js';
import { adjustStock } from '../inventory/service.js';
import mongoose from 'mongoose';

export const getSales = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const count = await SaleOrder.countDocuments();
    const sales = await SaleOrder.find()
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count,
      page,
      pages: Math.ceil(count / limit),
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

export const getSaleById = async (req, res, next) => {
  try {
    const sale = await SaleOrder.findById(req.params.id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name')
      .populate('items.productId', 'name sku unit');

    if (!sale) {
      res.status(404);
      throw new Error('Sale order not found');
    }

    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

export const createSale = async (req, res, next) => {
  try {
    const { customerName, warehouseId, items, notes, status } = req.body;

    if (!warehouseId || !items || items.length === 0) {
      res.status(400);
      throw new Error('Please provide warehouse and items list');
    }

    // Generate unique sale number (SAL-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const saleNumber = `SAL-${dateStr}-${rand}`;

    const sale = new SaleOrder({
      saleNumber,
      customerName,
      warehouseId,
      items,
      notes,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    // If completed immediately, trigger stock checks and deductions
    if (sale.status === 'Completed') {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        sale.completedAt = new Date();
        await sale.save({ session });

        // Subtract items from stock
        for (const item of sale.items) {
          await adjustStock({
            productId: item.productId,
            warehouseId: sale.warehouseId,
            quantityChange: -item.quantity, // Negative for deduction
            movementType: 'SALE_OUT',
            reason: `Sale completed: ${sale.saleNumber}`,
            referenceType: 'Sale',
            referenceId: sale._id,
            referenceNumber: sale.saleNumber,
            createdBy: req.user._id,
            session
          });
        }

        await session.commitTransaction();
        session.endSession();
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } else {
      await sale.save();
    }

    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

export const updateSaleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const saleId = req.params.id;

    if (!['Completed', 'Cancelled'].includes(status)) {
      res.status(400);
      throw new Error('Status must be Completed or Cancelled');
    }

    const sale = await SaleOrder.findById(saleId);
    if (!sale) {
      res.status(404);
      throw new Error('Sale order not found');
    }

    if (sale.status === status) {
      res.status(400);
      throw new Error(`Sale is already in status '${status}'`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const previousStatus = sale.status;
      sale.status = status;

      if (status === 'Completed') {
        sale.completedAt = new Date();
        await sale.save({ session });

        // Subtract items from stock
        for (const item of sale.items) {
          await adjustStock({
            productId: item.productId,
            warehouseId: sale.warehouseId,
            quantityChange: -item.quantity, // Subtract quantity
            movementType: 'SALE_OUT',
            reason: `Sale completed: ${sale.saleNumber}`,
            referenceType: 'Sale',
            referenceId: sale._id,
            referenceNumber: sale.saleNumber,
            createdBy: req.user._id,
            session
          });
        }
      } else if (status === 'Cancelled') {
        // If previously Completed, reverse the stock deduction
        if (previousStatus === 'Completed') {
          for (const item of sale.items) {
            await adjustStock({
              productId: item.productId,
              warehouseId: sale.warehouseId,
              quantityChange: item.quantity, // Add quantity back
              movementType: 'ADJUSTMENT',
              reason: `Sale cancelled: ${sale.saleNumber}`,
              referenceType: 'Sale',
              referenceId: sale._id,
              referenceNumber: sale.saleNumber,
              createdBy: req.user._id,
              session
            });
          }
        }
        await sale.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};
