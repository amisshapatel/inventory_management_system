import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../modules/roles/model.js';
import User from '../modules/users/model.js';
import Warehouse from '../modules/warehouses/model.js';
import Product from '../modules/products/model.js';
import CustomFieldDefinition from '../modules/products/customFieldModel.js';
import InventoryBalance from '../modules/inventory/balanceModel.js';
import StockMovement from '../modules/inventory/movementModel.js';
import { SystemSetting, NotificationSetting } from '../modules/settings/model.js';
import { DEFAULT_ROLES, PERMISSIONS } from '../config/constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seed = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockpilot');
    console.log('Database connected.');

    // 1. Seed Roles
    console.log('Seeding roles and permissions...');
    const seededRoles = {};
    for (const [roleName, roleData] of Object.entries(DEFAULT_ROLES)) {
      let role = await Role.findOne({ name: roleName });
      if (!role) {
        role = await Role.create(roleData);
        console.log(`Created role: ${roleName}`);
      } else {
        role.permissions = roleData.permissions;
        await role.save();
        console.log(`Updated permissions for role: ${roleName}`);
      }
      seededRoles[roleName] = role;
    }

    // 2. Seed Admin User
    console.log('Seeding admin user...');
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Alex Rivera',
        email: 'admin@example.com',
        password: 'Admin@123', // Will be hashed by pre-save hook
        role: seededRoles['Admin']._id,
        status: 'Active'
      });
      console.log('Created Admin user: admin@example.com (Password: Admin@123)');
    }

    // 3. Seed Default Warehouse
    console.log('Seeding default warehouse...');
    let defaultWarehouse = await Warehouse.findOne({ code: 'WH-MAIN' });
    if (!defaultWarehouse) {
      defaultWarehouse = await Warehouse.create({
        name: 'Warehouse A1',
        code: 'WH-MAIN',
        address: '100 Logistics Blvd, Sector 4',
        status: 'Active'
      });
      console.log('Created default warehouse: Warehouse A1 (WH-MAIN)');
    }

    // 4. Seed System Settings
    console.log('Seeding system settings...');
    let sysSettings = await SystemSetting.findOne();
    if (!sysSettings) {
      sysSettings = await SystemSetting.create({
        inventoryMode: 'Single',
        defaultWarehouseId: defaultWarehouse._id,
        allowNegativeStock: false
      });
      console.log('Created default SystemSettings');
    } else if (!sysSettings.defaultWarehouseId) {
      sysSettings.defaultWarehouseId = defaultWarehouse._id;
      await sysSettings.save();
    }

    // 5. Seed Notification Settings
    console.log('Seeding notification settings...');
    const eventTypes = [
      'low_stock',
      'purchase_completed',
      'sale_completed',
      'stock_adjustment',
      'stock_transfer',
      'import_completed',
      'import_failed'
    ];
    for (const eventType of eventTypes) {
      const exists = await NotificationSetting.findOne({ eventType });
      if (!exists) {
        await NotificationSetting.create({
          eventType,
          enabled: ['low_stock', 'stock_transfer', 'import_failed'].includes(eventType), // pre-enable some
          recipients: ['admin@example.com']
        });
        console.log(`Created NotificationSetting for: ${eventType}`);
      }
    }

    // 6. Seed Custom Field Definitions (Brand, Color, Size, Expiry Date)
    console.log('Seeding custom field definitions...');
    const customFields = [
      { label: 'Brand', key: 'brand', type: 'Text', required: false, showInList: true },
      { label: 'Color', key: 'color', type: 'Text', required: false, showInList: false },
      { label: 'Size', key: 'size', type: 'Text', required: false, showInList: false },
      { label: 'Expiry Date', key: 'expiryDate', type: 'Date', required: false, showInList: true }
    ];
    for (const field of customFields) {
      const exists = await CustomFieldDefinition.findOne({ key: field.key });
      if (!exists) {
        await CustomFieldDefinition.create(field);
        console.log(`Created custom field: ${field.label}`);
      }
    }

    // 7. Seed Sample Products and Balances
    console.log('Seeding sample products...');
    const sampleProducts = [
      {
        name: 'Ergonomic Keyboard MX',
        sku: 'KB-MX-01',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Premium split ergonomic wireless keyboard.',
        minimumStock: 15,
        customFields: { brand: 'Logitech', color: 'Black' }
      },
      {
        name: 'Battery Pack 5000mAh',
        sku: 'BAT-5K-02',
        category: 'Accessories',
        unit: 'Pcs',
        description: 'Compact external battery charger.',
        minimumStock: 10,
        customFields: { brand: 'Anker', expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } // expires in 3 days
      },
      {
        name: 'Mobile Cover',
        sku: 'COV-MOB-03',
        category: 'Accessories',
        unit: 'Pcs',
        description: 'Silicon soft phone bumper cover.',
        minimumStock: 5,
        customFields: { brand: 'Spigen', color: 'Clear' }
      }
    ];

    for (const prodData of sampleProducts) {
      let product = await Product.findOne({ sku: prodData.sku });
      if (!product) {
        // Set dates matching the dashboard visual
        if (prodData.sku === 'KB-MX-01') {
          prodData.lastMovementAt = new Date();
        } else if (prodData.sku === 'BAT-5K-02') {
          prodData.lastMovementAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'COV-MOB-03') {
          prodData.lastMovementAt = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000); // 75 days ago (Aging bucket)
          prodData.lastSaleAt = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000);
        }

        product = await Product.create(prodData);
        console.log(`Created product: ${product.name}`);

        // Seed Inventory Balance and initial StockMovement for each product
        let qty = 100;
        if (product.sku === 'KB-MX-01') qty = 4; // Low Stock (KB-MX-01 has min 15)
        else if (product.sku === 'BAT-5K-02') qty = 45; // Battery pack: 45 units
        else if (product.sku === 'COV-MOB-03') qty = 80;

        await InventoryBalance.create({
          productId: product._id,
          warehouseId: defaultWarehouse._id,
          quantity: qty
        });

        await StockMovement.create({
          productId: product._id,
          warehouseId: defaultWarehouse._id,
          movementType: 'OPENING_STOCK',
          quantity: qty,
          previousStock: 0,
          newStock: qty,
          reason: 'Initial database seed stock loading',
          referenceType: 'Import',
          referenceId: null,
          referenceNumber: 'SEED-001',
          createdBy: adminUser._id
        });
        console.log(`Seeded balance of ${qty} for ${product.name}`);
      }
    }

    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
