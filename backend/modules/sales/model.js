import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  sellingPrice: {
    type: Number,
    default: 0
  }
}, { _id: false });

const saleOrderSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customerName: {
    type: String,
    default: '',
    trim: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: {
    type: [saleItemSchema],
    validate: [arr => arr.length > 0, 'Sale order must contain at least one item']
  },
  status: {
    type: String,
    enum: ['Draft', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const SaleOrder = mongoose.model('SaleOrder', saleOrderSchema);
export default SaleOrder;
