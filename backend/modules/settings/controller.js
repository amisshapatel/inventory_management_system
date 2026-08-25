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

export const seedNotificationSettings = async (req, res, next) => {
  try {
    const eventTypes = [
      'low_stock',
      'purchase_completed',
      'sale_completed',
      'stock_adjustment',
      'stock_transfer',
      'import_completed',
      'import_failed'
    ];

    const createdSettings = [];
    for (const eventType of eventTypes) {
      const exists = await NotificationSetting.findOne({ eventType });
      if (!exists) {
        const setting = await NotificationSetting.create({
          eventType,
          enabled: ['low_stock', 'stock_transfer', 'import_failed'].includes(eventType),
          recipients: ['admin@example.com']
        });
        createdSettings.push(setting);
      }
    }

    // Return all notification settings
    const allSettings = await NotificationSetting.find();

    res.status(200).json({
      success: true,
      message: 'Notification settings seeded successfully',
      data: allSettings
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestEmail = async (req, res, next) => {
  try {
    const { notificationId } = req.body;
    
    // Find the notification setting
    const setting = await NotificationSetting.findById(notificationId);
    if (!setting) {
      res.status(404);
      throw new Error('Notification setting not found');
    }

    if (!setting.recipients || setting.recipients.length === 0) {
      res.status(400);
      throw new Error('No recipients configured for this notification');
    }

    // Import the email service
    const { triggerEmailAlert } = await import('../notifications/service.js');

    // Create test data based on event type
    const testData = {
      low_stock: {
        productName: 'Test Product',
        sku: 'TEST-001',
        warehouseId: null,
        currentStock: 5,
        minimumStock: 10
      },
      stock_transfer: {
        transferNumber: 'TEST-001',
        sourceName: 'Test Warehouse A',
        destinationName: 'Test Warehouse B',
        totalItems: 1
      },
      import_failed: {
        errorMessage: 'Test error message for import failure'
      }
    };

    const data = testData[setting.eventType] || {
      message: 'Test notification for ' + setting.eventType
    };

    // Send the test email
    await triggerEmailAlert(setting.eventType, data);

    res.status(200).json({
      success: true,
      message: `Test email sent to ${setting.recipients.join(', ')} for ${setting.eventType}`,
      data: {
        recipients: setting.recipients,
        eventType: setting.eventType
      }
    });
  } catch (error) {
    next(error);
  }
};
