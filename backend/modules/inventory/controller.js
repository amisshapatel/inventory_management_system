import InventoryBalance from './balanceModel.js';
import StockMovement from './movementModel.js';
import Product from '../products/model.js';
import { adjustStock } from './service.js';

// Get current inventory levels
export const getInventory = async (req, res, next) => {
  try {
    const warehouseId = req.query.warehouseId;
    const search = req.query.search || '';

    const filter = {};
    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    // If searching by product name or SKU, lookup the product IDs first
    if (search) {
      const matchedProducts = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const productIds = matchedProducts.map(p => p._id);
      filter.productId = { $in: productIds };
    }

    const balances = await InventoryBalance.find(filter)
      .populate('productId', 'name sku category unit minimumStock customFields')
      .populate('warehouseId', 'name code')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: balances.length,
      data: balances
    });
  } catch (error) {
    next(error);
  }
};

// Make a manual stock correction/adjustment
export const adjustStockManual = async (req, res, next) => {
  try {
    const { productId, warehouseId, quantity, reason } = req.body;

    if (!productId || !warehouseId || quantity === undefined || !reason) {
      res.status(400);
      throw new Error('Please enter product, warehouse, quantity change, and adjustment reason');
    }

    const qtyChange = Number(quantity);
    if (qtyChange === 0) {
      res.status(400);
      throw new Error('Adjustment quantity must not be zero');
    }

    const movementType = qtyChange > 0 ? 'MANUAL_INCREASE' : 'MANUAL_DECREASE';

    const movement = await adjustStock({
      productId,
      warehouseId,
      quantityChange: qtyChange,
      movementType,
      reason,
      referenceType: 'Adjustment',
      createdBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'Stock adjustment completed successfully',
      data: movement
    });
  } catch (error) {
    next(error);
  }
};

// Get paginated stock movement history
export const getStockMovements = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const { productId, warehouseId, movementType, referenceType, search } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (movementType) filter.movementType = movementType;
    if (referenceType) filter.referenceType = referenceType;

    // Search by product name or SKU if provided
    if (search) {
      const matchedProducts = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      filter.productId = { $in: matchedProducts.map(p => p._id) };
    }

    const count = await StockMovement.countDocuments(filter);
    const movements = await StockMovement.find(filter)
      .populate('productId', 'name sku unit')
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
      data: movements
    });
  } catch (error) {
    next(error);
  }
};
