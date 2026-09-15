import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../modules/roles/model.js';
import User from '../modules/users/model.js';
import Warehouse from '../modules/warehouses/model.js';
import Product from '../modules/products/model.js';
import CustomFieldDefinition from '../modules/products/customFieldModel.js';
import InventoryBalance from '../modules/inventory/balanceModel.js';
import StockMovement from '../modules/inventory/movementModel.js';
import PurchaseEntry from '../modules/purchases/model.js';
import StockTransfer from '../modules/transfers/model.js';
import SaleOrder from '../modules/sales/model.js';
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

    // 3.1 Seed Additional Warehouses
    console.log('Seeding additional warehouses...');
    const additionalWarehouses = [
      {
        name: 'Distribution Center East',
        code: 'WH-EAST',
        address: '2500 Industrial Parkway, East District',
        status: 'Active'
      },
      {
        name: 'Regional Hub West',
        code: 'WH-WEST',
        address: '1800 Commerce Drive, West Zone',
        status: 'Active'
      },
      {
        name: 'Cold Storage Facility',
        code: 'WH-COLD',
        address: '500 Refrigeration Road, North Sector',
        status: 'Active'
      },
      {
        name: 'Temporary Storage',
        code: 'WH-TEMP',
        address: '75 Transit Way, Central Hub',
        status: 'Inactive'
      }
    ];

    for (const whData of additionalWarehouses) {
      const exists = await Warehouse.findOne({ code: whData.code });
      if (!exists) {
        await Warehouse.create(whData);
        console.log(`Created warehouse: ${whData.name} (${whData.code})`);
      }
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
      },
      {
        name: 'Wireless Mouse Pro',
        sku: 'ELEC-MOUSE-01',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Ergonomic wireless mouse with precision tracking.',
        minimumStock: 20,
        customFields: { brand: 'Logitech', color: 'Black', size: 'Standard' }
      },
      {
        name: 'USB-C Hub Multiport',
        sku: 'ELEC-HUB-02',
        category: 'Electronics',
        unit: 'Pcs',
        description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader.',
        minimumStock: 15,
        customFields: { brand: 'Anker', color: 'Silver', size: 'Compact' }
      },
      {
        name: 'Bluetooth Headphones',
        sku: 'ELEC-AUDIO-03',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Noise-cancelling over-ear wireless headphones.',
        minimumStock: 10,
        customFields: { brand: 'Sony', color: 'Black', size: 'Large' }
      },
      {
        name: 'Webcam HD 1080p',
        sku: 'ELEC-CAM-04',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Full HD webcam with auto-focus and built-in microphone.',
        minimumStock: 12,
        customFields: { brand: 'Logitech', color: 'Black', size: 'Standard' }
      },
      {
        name: 'Smart Watch Series 5',
        sku: 'ELEC-WATCH-05',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Fitness tracking smartwatch with heart rate monitor.',
        minimumStock: 8,
        customFields: { brand: 'Apple', color: 'Space Gray', size: '44mm' }
      },
      {
        name: 'Portable SSD 1TB',
        sku: 'ELEC-SSD-06',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Ultra-fast portable solid state drive.',
        minimumStock: 10,
        customFields: { brand: 'Samsung', color: 'Black', size: 'Compact' }
      },
      {
        name: 'Wireless Charger Stand',
        sku: 'ELEC-CHRG-07',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Fast wireless charging stand for smartphones.',
        minimumStock: 25,
        customFields: { brand: 'Belkin', color: 'White', size: 'Standard' }
      },
      {
        name: 'Gaming Keyboard RGB',
        sku: 'ELEC-GKB-08',
        category: 'Electronics',
        unit: 'Pcs',
        description: 'Mechanical gaming keyboard with RGB backlighting.',
        minimumStock: 15,
        customFields: { brand: 'Razer', color: 'Black', size: 'Full Size' }
      },
      {
        name: 'Laptop Sleeve 15inch',
        sku: 'ELEC-SLV-09',
        category: 'Accessories',
        unit: 'Pcs',
        description: 'Protective neoprene laptop sleeve.',
        minimumStock: 30,
        customFields: { brand: 'Case Logic', color: 'Gray', size: '15 inch' }
      },
      {
        name: 'Screen Cleaning Kit',
        sku: 'ELEC-CLN-10',
        category: 'Accessories',
        unit: 'Pcs',
        description: 'Microfiber cloth and cleaning solution for screens.',
        minimumStock: 50,
        customFields: { brand: 'Whoosh!', color: 'Clear', size: 'Standard' }
      },
      {
        name: 'HDMI Cable 6ft',
        sku: 'ELEC-HDMI-11',
        category: 'Accessories',
        unit: 'Pcs',
        description: 'High-speed HDMI cable with 4K support.',
        minimumStock: 40,
        customFields: { brand: 'Amazon Basics', color: 'Black', size: '6ft' }
      },
      {
        name: 'Power Strip Surge Protector',
        sku: 'ELEC-PWR-12',
        category: 'Electronics',
        unit: 'Pcs',
        description: '6-outlet surge protector with USB ports.',
        minimumStock: 20,
        customFields: { brand: 'APC', color: 'Black', size: 'Standard' }
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
        } else if (prodData.sku === 'ELEC-MOUSE-01') {
          prodData.lastMovementAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-HUB-02') {
          prodData.lastMovementAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-AUDIO-03') {
          prodData.lastMovementAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-CAM-04') {
          prodData.lastMovementAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-WATCH-05') {
          prodData.lastMovementAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-SSD-06') {
          prodData.lastMovementAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-CHRG-07') {
          prodData.lastMovementAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-GKB-08') {
          prodData.lastMovementAt = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-SLV-09') {
          prodData.lastMovementAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-CLN-10') {
          prodData.lastMovementAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-HDMI-11') {
          prodData.lastMovementAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        } else if (prodData.sku === 'ELEC-PWR-12') {
          prodData.lastMovementAt = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        }

        product = await Product.create(prodData);
        console.log(`Created product: ${product.name}`);

        // Seed Inventory Balance and initial StockMovement for each product
        let qty = 100;
        if (product.sku === 'KB-MX-01') qty = 4; // Low Stock (KB-MX-01 has min 15)
        else if (product.sku === 'BAT-5K-02') qty = 45; // Battery pack: 45 units
        else if (product.sku === 'COV-MOB-03') qty = 80;
        else if (product.sku === 'ELEC-MOUSE-01') qty = 35;
        else if (product.sku === 'ELEC-HUB-02') qty = 28;
        else if (product.sku === 'ELEC-AUDIO-03') qty = 18;
        else if (product.sku === 'ELEC-CAM-04') qty = 22;
        else if (product.sku === 'ELEC-WATCH-05') qty = 5; // Low stock
        else if (product.sku === 'ELEC-SSD-06') qty = 15;
        else if (product.sku === 'ELEC-CHRG-07') qty = 55;
        else if (product.sku === 'ELEC-GKB-08') qty = 32;
        else if (product.sku === 'ELEC-SLV-09') qty = 65;
        else if (product.sku === 'ELEC-CLN-10') qty = 85;
        else if (product.sku === 'ELEC-HDMI-11') qty = 72;
        else if (product.sku === 'ELEC-PWR-12') qty = 40;

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

        // Distribute some products to additional warehouses
        const eastWarehouse = await Warehouse.findOne({ code: 'WH-EAST' });
        const westWarehouse = await Warehouse.findOne({ code: 'WH-WEST' });
        
        if (eastWarehouse && ['ELEC-MOUSE-01', 'ELEC-HUB-02', 'ELEC-CHRG-07'].includes(product.sku)) {
          const eastQty = Math.floor(qty * 0.3); // 30% to east warehouse
          await InventoryBalance.create({
            productId: product._id,
            warehouseId: eastWarehouse._id,
            quantity: eastQty
          });
          await StockMovement.create({
            productId: product._id,
            warehouseId: eastWarehouse._id,
            movementType: 'OPENING_STOCK',
            quantity: eastQty,
            previousStock: 0,
            newStock: eastQty,
            reason: 'Initial database seed stock loading - East distribution',
            referenceType: 'Import',
            referenceId: null,
            referenceNumber: 'SEED-002',
            createdBy: adminUser._id
          });
          console.log(`Seeded balance of ${eastQty} for ${product.name} in East Warehouse`);
        }

        if (westWarehouse && ['ELEC-AUDIO-03', 'ELEC-CAM-04', 'ELEC-SSD-06'].includes(product.sku)) {
          const westQty = Math.floor(qty * 0.25); // 25% to west warehouse
          await InventoryBalance.create({
            productId: product._id,
            warehouseId: westWarehouse._id,
            quantity: westQty
          });
          await StockMovement.create({
            productId: product._id,
            warehouseId: westWarehouse._id,
            movementType: 'OPENING_STOCK',
            quantity: westQty,
            previousStock: 0,
            newStock: westQty,
            reason: 'Initial database seed stock loading - West distribution',
            referenceType: 'Import',
            referenceId: null,
            referenceNumber: 'SEED-003',
            createdBy: adminUser._id
          });
          console.log(`Seeded balance of ${westQty} for ${product.name} in West Warehouse`);
        }
      }
    }

    // 8. Distribute existing products to new warehouses
    console.log('Distributing existing products to new warehouses...');
    const eastWarehouse = await Warehouse.findOne({ code: 'WH-EAST' });
    const westWarehouse = await Warehouse.findOne({ code: 'WH-WEST' });
    
    if (eastWarehouse || westWarehouse) {
      const allProducts = await Product.find();
      
      for (const product of allProducts) {
        // Check if product already has balance in main warehouse
        const mainBalance = await InventoryBalance.findOne({
          productId: product._id,
          warehouseId: defaultWarehouse._id
        });
        
        if (mainBalance && mainBalance.quantity > 0) {
          // Distribute to East Warehouse
          if (eastWarehouse && ['ELEC-MOUSE-01', 'ELEC-HUB-02', 'ELEC-CHRG-07'].includes(product.sku)) {
            const existingEastBalance = await InventoryBalance.findOne({
              productId: product._id,
              warehouseId: eastWarehouse._id
            });
            
            if (!existingEastBalance) {
              const eastQty = Math.floor(mainBalance.quantity * 0.3);
              await InventoryBalance.create({
                productId: product._id,
                warehouseId: eastWarehouse._id,
                quantity: eastQty
              });
              await StockMovement.create({
                productId: product._id,
                warehouseId: eastWarehouse._id,
                movementType: 'OPENING_STOCK',
                quantity: eastQty,
                previousStock: 0,
                newStock: eastQty,
                reason: 'Stock distribution to East Warehouse',
                referenceType: 'Transfer',
                referenceId: null,
                referenceNumber: 'DIST-EAST-001',
                createdBy: adminUser._id
              });
              console.log(`Distributed ${eastQty} units of ${product.name} to East Warehouse`);
            }
          }
          
          // Distribute to West Warehouse
          if (westWarehouse && ['ELEC-AUDIO-03', 'ELEC-CAM-04', 'ELEC-SSD-06'].includes(product.sku)) {
            const existingWestBalance = await InventoryBalance.findOne({
              productId: product._id,
              warehouseId: westWarehouse._id
            });
            
            if (!existingWestBalance) {
              const westQty = Math.floor(mainBalance.quantity * 0.25);
              await InventoryBalance.create({
                productId: product._id,
                warehouseId: westWarehouse._id,
                quantity: westQty
              });
              await StockMovement.create({
                productId: product._id,
                warehouseId: westWarehouse._id,
                movementType: 'OPENING_STOCK',
                quantity: westQty,
                previousStock: 0,
                newStock: westQty,
                reason: 'Stock distribution to West Warehouse',
                referenceType: 'Transfer',
                referenceId: null,
                referenceNumber: 'DIST-WEST-001',
                createdBy: adminUser._id
              });
              console.log(`Distributed ${westQty} units of ${product.name} to West Warehouse`);
            }
          }
        }
      }
    }

    // 9. Seed Sample Purchase Entries
    console.log('Seeding sample purchase entries...');
    const coldStorageWarehouse = await Warehouse.findOne({ code: 'WH-COLD' });
    const purchaseEastWarehouse = await Warehouse.findOne({ code: 'WH-EAST' });
    const purchaseWestWarehouse = await Warehouse.findOne({ code: 'WH-WEST' });
    
    // Fetch products needed for purchases
    const ssdProduct = await Product.findOne({ sku: 'ELEC-SSD-06' });
    const audioProduct = await Product.findOne({ sku: 'ELEC-AUDIO-03' });
    const mouseProduct = await Product.findOne({ sku: 'ELEC-MOUSE-01' });
    const hubProduct = await Product.findOne({ sku: 'ELEC-HUB-02' });
    const camProduct = await Product.findOne({ sku: 'ELEC-CAM-04' });
    const chargerProduct = await Product.findOne({ sku: 'ELEC-CHRG-07' });
    const watchProduct = await Product.findOne({ sku: 'ELEC-WATCH-05' });
    const keyboardProduct = await Product.findOne({ sku: 'ELEC-GKB-08' });
    
    // Verify all required products exist
    if (!ssdProduct || !audioProduct || !mouseProduct || !hubProduct || !camProduct || !chargerProduct || !watchProduct || !keyboardProduct) {
      console.log('Some required products for purchases are missing, skipping purchase seeding');
    } else {
      const samplePurchases = [
        {
          purchaseNumber: 'PO-2024-001',
          supplierName: 'TechSupply Co.',
          warehouseId: coldStorageWarehouse._id,
          items: [
            { productId: ssdProduct._id, quantity: 20, costPrice: 89.99 },
            { productId: audioProduct._id, quantity: 15, costPrice: 199.99 }
          ],
          status: 'Completed',
          notes: 'Cold storage sensitive electronics shipment',
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          purchaseNumber: 'PO-2024-002',
          supplierName: 'Global Logistics Inc.',
          warehouseId: purchaseEastWarehouse._id,
          items: [
            { productId: mouseProduct._id, quantity: 50, costPrice: 29.99 },
            { productId: hubProduct._id, quantity: 30, costPrice: 49.99 }
          ],
          status: 'Completed',
          notes: 'East distribution center restock',
          completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        },
        {
          purchaseNumber: 'PO-2024-003',
          supplierName: 'West Coast Supplies',
          warehouseId: purchaseWestWarehouse._id,
          items: [
            { productId: camProduct._id, quantity: 25, costPrice: 79.99 },
            { productId: chargerProduct._id, quantity: 40, costPrice: 34.99 }
          ],
          status: 'Draft',
          notes: 'Pending west regional hub order'
        },
        {
          purchaseNumber: 'PO-2024-004',
          supplierName: 'Premium Electronics Ltd.',
          warehouseId: defaultWarehouse._id,
          items: [
            { productId: watchProduct._id, quantity: 10, costPrice: 349.99 },
            { productId: keyboardProduct._id, quantity: 20, costPrice: 129.99 }
          ],
          status: 'Completed',
          notes: 'Premium restock for main warehouse',
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          purchaseNumber: 'PO-2024-005',
          supplierName: 'QuickShip Distributors',
          warehouseId: coldStorageWarehouse._id,
          items: [
            { productId: ssdProduct._id, quantity: 30, costPrice: 85.50 }
          ],
          status: 'Draft',
          notes: 'Additional cold storage items pending approval'
        },
        {
          purchaseNumber: 'PO-2024-006',
          supplierName: 'East Coast Tech',
          warehouseId: purchaseEastWarehouse._id,
          items: [
            { productId: mouseProduct._id, quantity: 25, costPrice: 28.99 },
            { productId: chargerProduct._id, quantity: 35, costPrice: 32.99 }
          ],
          status: 'Completed',
          notes: 'Regular east warehouse restock',
          completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        }
      ];

    for (const purchaseData of samplePurchases) {
      const exists = await PurchaseEntry.findOne({ purchaseNumber: purchaseData.purchaseNumber });
      if (!exists) {
        const purchase = await PurchaseEntry.create({
          ...purchaseData,
          createdBy: adminUser._id
        });
        
        // Get warehouse name for logging
        const warehouse = await Warehouse.findById(purchase.warehouseId);
        console.log(`Created purchase entry: ${purchase.purchaseNumber} for ${warehouse?.name || 'Unknown'}`);
        
        // Add stock to inventory for completed purchases
        if (purchase.status === 'Completed') {
          for (const item of purchase.items) {
            const existingBalance = await InventoryBalance.findOne({
              productId: item.productId,
              warehouseId: purchase.warehouseId
            });
            
            const newQty = existingBalance ? existingBalance.quantity + item.quantity : item.quantity;
            
            if (existingBalance) {
              existingBalance.quantity = newQty;
              await existingBalance.save();
            } else {
              await InventoryBalance.create({
                productId: item.productId,
                warehouseId: purchase.warehouseId,
                quantity: item.quantity
              });
            }
            
            await StockMovement.create({
              productId: item.productId,
              warehouseId: purchase.warehouseId,
              movementType: 'PURCHASE_IN',
              quantity: item.quantity,
              previousStock: existingBalance ? existingBalance.quantity - item.quantity : 0,
              newStock: newQty,
              reason: `Purchase receipt: ${purchase.purchaseNumber}`,
              referenceType: 'Purchase',
              referenceId: purchase._id,
              referenceNumber: purchase.purchaseNumber,
              createdBy: adminUser._id
            });
          }
          console.log(`Updated inventory for completed purchase: ${purchase.purchaseNumber}`);
        }
      }
    }
    }

    // 10. Seed Sample Stock Transfers
    console.log('Seeding sample stock transfers...');
    const transferEastWarehouse = await Warehouse.findOne({ code: 'WH-EAST' });
    const transferWestWarehouse = await Warehouse.findOne({ code: 'WH-WEST' });
    const transferColdWarehouse = await Warehouse.findOne({ code: 'WH-COLD' });
    
    // Get products for transfers
    const transferMouseProduct = await Product.findOne({ sku: 'ELEC-MOUSE-01' });
    const transferSSDProduct = await Product.findOne({ sku: 'ELEC-SSD-06' });
    const transferAudioProduct = await Product.findOne({ sku: 'ELEC-AUDIO-03' });
    
    if (transferMouseProduct && transferSSDProduct && transferAudioProduct) {
      const sampleTransfers = [
        {
          transferNumber: 'TRF-2024-001',
          sourceWarehouseId: defaultWarehouse._id,
          destinationWarehouseId: transferEastWarehouse._id,
          items: [
            { productId: transferMouseProduct._id, quantity: 15 }
          ],
          status: 'Completed',
          notes: 'Emergency restock for East distribution center',
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          transferNumber: 'TRF-2024-002',
          sourceWarehouseId: transferEastWarehouse._id,
          destinationWarehouseId: transferWestWarehouse._id,
          items: [
            { productId: transferSSDProduct._id, quantity: 8 }
          ],
          status: 'Draft',
          notes: 'Pending approval for cross-regional SSD transfer'
        },
        {
          transferNumber: 'TRF-2024-003',
          sourceWarehouseId: defaultWarehouse._id,
          destinationWarehouseId: transferColdWarehouse._id,
          items: [
            { productId: transferAudioProduct._id, quantity: 5 }
          ],
          status: 'Completed',
          notes: 'Premium audio equipment to cold storage facility',
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          transferNumber: 'TRF-2024-004',
          sourceWarehouseId: transferWestWarehouse._id,
          destinationWarehouseId: transferEastWarehouse._id,
          items: [
            { productId: transferMouseProduct._id, quantity: 10 },
            { productId: transferSSDProduct._id, quantity: 5 }
          ],
          status: 'Draft',
          notes: 'Proposed west-to-east equipment redistribution'
        }
      ];

      for (const transferData of sampleTransfers) {
        const exists = await StockTransfer.findOne({ transferNumber: transferData.transferNumber });
        if (!exists) {
          const transfer = await StockTransfer.create({
            ...transferData,
            createdBy: adminUser._id
          });
          
          const sourceWarehouse = await Warehouse.findById(transfer.sourceWarehouseId);
          const destWarehouse = await Warehouse.findById(transfer.destinationWarehouseId);
          console.log(`Created stock transfer: ${transfer.transferNumber} from ${sourceWarehouse?.name} to ${destWarehouse?.name}`);
          
          // Process stock movements for completed transfers
          if (transfer.status === 'Completed') {
            for (const item of transfer.items) {
              // Deduct from source warehouse
              const sourceBalance = await InventoryBalance.findOne({
                productId: item.productId,
                warehouseId: transfer.sourceWarehouseId
              });
              
              if (sourceBalance && sourceBalance.quantity >= item.quantity) {
                const oldSourceQty = sourceBalance.quantity;
                sourceBalance.quantity -= item.quantity;
                await sourceBalance.save();
                
                await StockMovement.create({
                  productId: item.productId,
                  warehouseId: transfer.sourceWarehouseId,
                  movementType: 'TRANSFER_OUT',
                  quantity: -item.quantity,
                  previousStock: oldSourceQty,
                  newStock: sourceBalance.quantity,
                  reason: `Stock transfer out: ${transfer.transferNumber}`,
                  referenceType: 'Transfer',
                  referenceId: transfer._id,
                  referenceNumber: transfer.transferNumber,
                  createdBy: adminUser._id
                });
              }
              
              // Add to destination warehouse
              const destBalance = await InventoryBalance.findOne({
                productId: item.productId,
                warehouseId: transfer.destinationWarehouseId
              });
              
              const oldDestQty = destBalance ? destBalance.quantity : 0;
              const newDestQty = oldDestQty + item.quantity;
              
              if (destBalance) {
                destBalance.quantity = newDestQty;
                await destBalance.save();
              } else {
                await InventoryBalance.create({
                  productId: item.productId,
                  warehouseId: transfer.destinationWarehouseId,
                  quantity: item.quantity
                });
              }
              
              await StockMovement.create({
                productId: item.productId,
                warehouseId: transfer.destinationWarehouseId,
                movementType: 'TRANSFER_IN',
                quantity: item.quantity,
                previousStock: oldDestQty,
                newStock: newDestQty,
                reason: `Stock transfer in: ${transfer.transferNumber}`,
                referenceType: 'Transfer',
                referenceId: transfer._id,
                referenceNumber: transfer.transferNumber,
                createdBy: adminUser._id
              });
            }
            console.log(`Processed inventory movements for completed transfer: ${transfer.transferNumber}`);
          }
        }
      }
    }

    // 11. Seed Sample Sales
    console.log('Seeding sample sales...');
    const saleColdWarehouse = await Warehouse.findOne({ code: 'WH-COLD' });
    const saleEastWarehouse = await Warehouse.findOne({ code: 'WH-EAST' });
    const saleWestWarehouse = await Warehouse.findOne({ code: 'WH-WEST' });
    
    // Get products for sales
    const saleMouseProduct = await Product.findOne({ sku: 'ELEC-MOUSE-01' });
    const saleSSDProduct = await Product.findOne({ sku: 'ELEC-SSD-06' });
    const saleAudioProduct = await Product.findOne({ sku: 'ELEC-AUDIO-03' });
    const saleWatchProduct = await Product.findOne({ sku: 'ELEC-WATCH-05' });
    const saleHubProduct = await Product.findOne({ sku: 'ELEC-HUB-02' });
    
    if (saleMouseProduct && saleSSDProduct && saleAudioProduct && saleWatchProduct && saleHubProduct) {
      const sampleSales = [
        {
          saleNumber: 'SALE-2024-001',
          customerName: 'Tech Solutions Inc.',
          warehouseId: saleColdWarehouse._id,
          items: [
            { productId: saleSSDProduct._id, quantity: 3, sellingPrice: 149.99 },
            { productId: saleAudioProduct._id, quantity: 2, sellingPrice: 249.99 }
          ],
          status: 'Completed',
          notes: 'Premium equipment purchase from cold storage',
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          saleNumber: 'SALE-2024-002',
          customerName: 'East Coast Retailers',
          warehouseId: saleEastWarehouse._id,
          items: [
            { productId: saleMouseProduct._id, quantity: 12, sellingPrice: 39.99 },
            { productId: saleHubProduct._id, quantity: 8, sellingPrice: 59.99 }
          ],
          status: 'Completed',
          notes: 'Bulk order for east distribution retail partners',
          completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
          saleNumber: 'SALE-2024-003',
          customerName: 'West Region Tech',
          warehouseId: saleWestWarehouse._id,
          items: [
            { productId: saleSSDProduct._id, quantity: 5, sellingPrice: 129.99 }
          ],
          status: 'Draft',
          notes: 'Pending approval for west region SSD sale'
        },
        {
          saleNumber: 'SALE-2024-004',
          customerName: 'Premium Customer',
          warehouseId: defaultWarehouse._id,
          items: [
            { productId: saleWatchProduct._id, quantity: 2, sellingPrice: 399.99 },
            { productId: saleAudioProduct._id, quantity: 1, sellingPrice: 279.99 }
          ],
          status: 'Completed',
          notes: 'High-value customer purchase from main warehouse',
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          saleNumber: 'SALE-2024-005',
          customerName: 'Quick Order Corp',
          warehouseId: saleEastWarehouse._id,
          items: [
            { productId: saleMouseProduct._id, quantity: 5, sellingPrice: 34.99 }
          ],
          status: 'Draft',
          notes: 'Rush order pending inventory confirmation'
        },
        {
          saleNumber: 'SALE-2024-006',
          customerName: 'Government Agency',
          warehouseId: saleColdWarehouse._id,
          items: [
            { productId: saleSSDProduct._id, quantity: 10, sellingPrice: 119.99 },
            { productId: saleAudioProduct._id, quantity: 5, sellingPrice: 229.99 }
          ],
          status: 'Completed',
          notes: 'Government contract fulfillment from cold storage',
          completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
        }
      ];

      for (const saleData of sampleSales) {
        const exists = await SaleOrder.findOne({ saleNumber: saleData.saleNumber });
        if (!exists) {
          const sale = await SaleOrder.create({
            ...saleData,
            createdBy: adminUser._id
          });
          
          const warehouse = await Warehouse.findById(sale.warehouseId);
          console.log(`Created sale: ${sale.saleNumber} for ${warehouse?.name || 'Unknown'}`);
          
          // Process stock movements for completed sales
          if (sale.status === 'Completed') {
            for (const item of sale.items) {
              const balance = await InventoryBalance.findOne({
                productId: item.productId,
                warehouseId: sale.warehouseId
              });
              
              if (balance && balance.quantity >= item.quantity) {
                const oldQty = balance.quantity;
                balance.quantity -= item.quantity;
                await balance.save();
                
                await StockMovement.create({
                  productId: item.productId,
                  warehouseId: sale.warehouseId,
                  movementType: 'SALE_OUT',
                  quantity: -item.quantity,
                  previousStock: oldQty,
                  newStock: balance.quantity,
                  reason: `Sale: ${sale.saleNumber} - ${sale.customerName}`,
                  referenceType: 'Sale',
                  referenceId: sale._id,
                  referenceNumber: sale.saleNumber,
                  createdBy: adminUser._id
                });
              }
            }
            console.log(`Processed inventory movements for completed sale: ${sale.saleNumber}`);
          }
        }
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
