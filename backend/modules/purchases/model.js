import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
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
  costPrice: {
    type: Number,
    default: 0
  }
}, { _id: false });

const purchaseEntrySchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  supplierName: {
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
    type: [purchaseItemSchema],
    validate: [arr => arr.length > 0, 'Purchase entry must contain at least one item']
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
  attachments: {
    type: [String],
    default: []
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

const PurchaseEntry = mongoose.model('PurchaseEntry', purchaseEntrySchema);
export default PurchaseEntry;
