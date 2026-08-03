import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  movementType: {
    type: String,
    enum: [
      'OPENING_STOCK',
      'PURCHASE_IN',
      'SALE_OUT',
      'MANUAL_INCREASE',
      'MANUAL_DECREASE',
      'ADJUSTMENT',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'RETURN_IN',
      'RETURN_OUT',
      'IMPORT_OPENING_STOCK'
    ],
    required: true
  },
  quantity: {
    type: Number,
    required: true // Can be positive or negative
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: '',
    trim: true
  },
  referenceType: {
    type: String,
    enum: ['Purchase', 'Sale', 'Transfer', 'Adjustment', 'Import'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  referenceNumber: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only track createdAt
});

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
