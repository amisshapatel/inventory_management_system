import mongoose from 'mongoose';

// Schema for email alert notifications
const notificationSettingSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'low_stock',
      'purchase_completed',
      'sale_completed',
      'stock_adjustment',
      'stock_transfer',
      'import_completed',
      'import_failed'
    ]
  },
  enabled: {
    type: Boolean,
    default: false
  },
  recipients: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const agingBucketSchema = new mongoose.Schema({
  label: { type: String, required: true },
  minDays: { type: Number, required: true },
  maxDays: { type: Number, required: true } // use large number like 99999 for "180+ days"
}, { _id: false });

// Schema for global system settings
const systemSettingSchema = new mongoose.Schema({
  inventoryMode: {
    type: String,
    enum: ['Single', 'Multi'],
    default: 'Single'
  },
  defaultWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null
  },
  allowNegativeStock: {
    type: Boolean,
    default: false
  },
  agingBuckets: {
    type: [agingBucketSchema],
    default: [
      { label: '0–30 days', minDays: 0, maxDays: 30 },
      { label: '31–60 days', minDays: 31, maxDays: 60 },
      { label: '61–90 days', minDays: 61, maxDays: 90 },
      { label: '91–180 days', minDays: 91, maxDays: 180 },
      { label: '180+ days', minDays: 181, maxDays: 99999 }
    ]
  }
}, {
  timestamps: true
});

export const NotificationSetting = mongoose.model('NotificationSetting', notificationSettingSchema);
export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
