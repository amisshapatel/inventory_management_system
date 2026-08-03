import { SystemSetting, NotificationSetting } from './model.js';
import Warehouse from '../warehouses/model.js';

export const getSettings = async (req, res, next) => {
  try {
    let system = await SystemSetting.findOne().populate('defaultWarehouseId', 'name code');
    if (!system) {
      // Return a default mock settings structure if DB not seeded
      system = {
        inventoryMode: 'Single',
        defaultWarehouseId: null,
        allowNegativeStock: false,
        agingBuckets: [
          { label: '0–30 days', minDays: 0, maxDays: 30 },
          { label: '31–60 days', minDays: 31, maxDays: 60 },
          { label: '61–90 days', minDays: 61, maxDays: 90 },
          { label: '91–180 days', minDays: 91, maxDays: 180 },
          { label: '180+ days', minDays: 181, maxDays: 99999 }
        ]
      };
    }

    const notifications = await NotificationSetting.find();

    res.status(200).json({
      success: true,
      data: {
        system,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateSystemSettings = async (req, res, next) => {
  try {
    const { inventoryMode, defaultWarehouseId, allowNegativeStock, agingBuckets } = req.body;

    let system = await SystemSetting.findOne();
    if (!system) {
      system = new SystemSetting();
    }

    if (inventoryMode) system.inventoryMode = inventoryMode;
    
    if (defaultWarehouseId) {
      const wh = await Warehouse.findById(defaultWarehouseId);
      if (!wh) {
        res.status(404);
        throw new Error('Default warehouse not found');
      }
      system.defaultWarehouseId = defaultWarehouseId;
    } else if (defaultWarehouseId === null) {
      system.defaultWarehouseId = null;
    }

    if (allowNegativeStock !== undefined) system.allowNegativeStock = !!allowNegativeStock;
    if (agingBuckets) system.agingBuckets = agingBuckets;

    await system.save();

    const updated = await SystemSetting.findById(system._id).populate('defaultWarehouseId', 'name code');

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationSetting = async (req, res, next) => {
  try {
    const { enabled, recipients } = req.body;
    const settingId = req.params.id;

    const setting = await NotificationSetting.findById(settingId);
    if (!setting) {
      res.status(404);
      throw new Error('Notification setting not found');
    }

    if (enabled !== undefined) setting.enabled = !!enabled;
    if (recipients) {
      // Simple email validation checks
      const validEmails = recipients.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      setting.recipients = validEmails;
    }

    await setting.save();

    res.status(200).json({
      success: true,
      message: `Notification updated for event: ${setting.eventType}`,
      data: setting
    });
  } catch (error) {
    next(error);
  }
};
