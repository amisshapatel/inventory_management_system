import PurchaseEntry from './model.js';
import { adjustStock } from '../inventory/service.js';
import mongoose from 'mongoose';

export const getPurchases = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const count = await PurchaseEntry.countDocuments();
    const purchases = await PurchaseEntry.find()
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
      data: purchases
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await PurchaseEntry.findById(req.params.id)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name')
      .populate('items.productId', 'name sku unit');

    if (!purchase) {
      res.status(404);
      throw new Error('Purchase entry not found');
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (req, res, next) => {
  try {
    const { supplierName, warehouseId, items, notes, status } = req.body;

    if (!warehouseId || !items || items.length === 0) {
      res.status(400);
      throw new Error('Please provide warehouse and items list');
    }

    // Generate unique purchase number (PUR-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const purchaseNumber = `PUR-${dateStr}-${rand}`;

    const purchase = new PurchaseEntry({
      purchaseNumber,
      supplierName,
      warehouseId,
      items,
      notes,
      status: status || 'Draft',
      createdBy: req.user._id
    });

    // If completed immediately, trigger stock adjustments
    if (purchase.status === 'Completed') {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        purchase.completedAt = new Date();
        await purchase.save({ session });

        // Add items to stock
        for (const item of purchase.items) {
          await adjustStock({
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            quantityChange: item.quantity,
            movementType: 'PURCHASE_IN',
            reason: `Purchase complete: ${purchase.purchaseNumber}`,
            referenceType: 'Purchase',
            referenceId: purchase._id,
            referenceNumber: purchase.purchaseNumber,
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
      await purchase.save();
    }

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const purchaseId = req.params.id;

    if (!['Completed', 'Cancelled'].includes(status)) {
      res.status(400);
      throw new Error('Status must be Completed or Cancelled');
    }

    const purchase = await PurchaseEntry.findById(purchaseId);
    if (!purchase) {
      res.status(404);
      throw new Error('Purchase entry not found');
    }

    if (purchase.status === status) {
      res.status(400);
      throw new Error(`Purchase is already in status '${status}'`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const previousStatus = purchase.status;
      purchase.status = status;

      if (status === 'Completed') {
        purchase.completedAt = new Date();
        await purchase.save({ session });

        // Add items to stock
        for (const item of purchase.items) {
          await adjustStock({
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            quantityChange: item.quantity,
            movementType: 'PURCHASE_IN',
            reason: `Purchase complete: ${purchase.purchaseNumber}`,
            referenceType: 'Purchase',
            referenceId: purchase._id,
            referenceNumber: purchase.purchaseNumber,
            createdBy: req.user._id,
            session
          });
        }
      } else if (status === 'Cancelled') {
        // If it was Completed previously, we must reverse the stock addition
        if (previousStatus === 'Completed') {
          for (const item of purchase.items) {
            await adjustStock({
              productId: item.productId,
              warehouseId: purchase.warehouseId,
              quantityChange: -item.quantity, // Subtract the quantity back
              movementType: 'ADJUSTMENT',
              reason: `Purchase cancelled: ${purchase.purchaseNumber}`,
              referenceType: 'Purchase',
              referenceId: purchase._id,
              referenceNumber: purchase.purchaseNumber,
              createdBy: req.user._id,
              session
            });
          }
        }
        await purchase.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};
