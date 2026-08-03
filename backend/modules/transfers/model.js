import mongoose from 'mongoose';

const transferItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const stockTransferSchema = new mongoose.Schema({
  transferNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sourceWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  destinationWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: {
    type: [transferItemSchema],
    validate: [arr => arr.length > 0, 'Transfer must contain at least one item']
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
  pdfUrl: {
    type: String,
    default: ''
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

const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);
export default StockTransfer;
