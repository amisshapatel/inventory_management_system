import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  minimumStock: {
    type: Number,
    required: true,
    default: 0
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastMovementAt: {
    type: Date
  },
  lastPurchaseAt: {
    type: Date
  },
  lastSaleAt: {
    type: Date
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;
