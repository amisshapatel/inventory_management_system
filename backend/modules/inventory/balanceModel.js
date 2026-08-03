import mongoose from 'mongoose';

const inventoryBalanceSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: { createdAt: false, updatedAt: true } // Only track updatedAt
});

// Compound unique index to prevent duplicate records
inventoryBalanceSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

const InventoryBalance = mongoose.model('InventoryBalance', inventoryBalanceSchema);
export default InventoryBalance;
