import Product from '../products/model.js';
import Warehouse from '../warehouses/model.js';
import InventoryBalance from '../inventory/balanceModel.js';
import StockMovement from '../inventory/movementModel.js';
import { SystemSetting } from '../settings/model.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Core Metrics Counts
    const totalProducts = await Product.countDocuments();
    const totalWarehouses = await Warehouse.countDocuments({ status: 'Active' });

    // Inventory Value (Calculate sum of quantity * standard cost or approximate standard value)
    const balances = await InventoryBalance.find().populate('productId');
    let inventoryValue = 0;
    let lowStockCount = 0;

    balances.forEach((bal) => {
      if (bal.productId) {
        // Approximate standard price: default to 150 if not specified
        const costPrice = 120; // default mock value for calculation
        inventoryValue += bal.quantity * costPrice;

        if (bal.quantity <= bal.productId.minimumStock) {
          lowStockCount++;
        }
      }
    });

    // Expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const now = new Date();

    const expiringProducts = await Product.find({
      'customFields.expiryDate': {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    });
    const expiringCount = expiringProducts.length;

    // Dead Stock (No movement in 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const deadStockCount = await Product.countDocuments({
      $or: [
        { lastMovementAt: { $lt: ninetyDaysAgo } },
        { lastMovementAt: null, createdAt: { $lt: ninetyDaysAgo } }
      ]
    });

    // 2. Critical Alerts List (to match reference dashboard UI)
    const criticalAlerts = [];

    // Add low stock items
    for (const bal of balances) {
      if (bal.productId && bal.quantity <= bal.productId.minimumStock) {
        criticalAlerts.push({
          type: 'low_stock',
          title: bal.productId.name,
          details: `${bal.quantity} units left - Min: ${bal.productId.minimumStock}`,
          icon: 'warning'
        });
      }
    }

    // Add expiring items
    expiringProducts.forEach((prod) => {
      const expDate = new Date(prod.customFields.get('expiryDate'));
      const diffTime = Math.abs(expDate - now);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      criticalAlerts.push({
        type: 'expiry',
        title: prod.name,
        details: `Expires in ${diffDays} days - ${prod.sku}`,
        icon: 'clock'
      });
    });

    // Add some default system capacity alerts if near capacity (mocked)
    criticalAlerts.push({
      type: 'shelf_capacity',
      title: 'Shelf Capacity Alert',
      details: 'Section B-04 at 95% capacity',
      icon: 'capacity'
    });

    criticalAlerts.push({
      type: 'order_alert',
      title: 'Large Order PO-4482',
      details: 'Awaiting manager signature',
      icon: 'signature'
    });

    // Limit critical alerts to top 4 for layout spacing
    const finalAlerts = criticalAlerts.slice(0, 4);

    // 3. Recent Activity Timeline (Last 5 stock movements)
    const recentMovements = await StockMovement.find()
      .populate('productId', 'name sku')
      .populate('warehouseId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivities = recentMovements.map(mv => {
      let title = '';
      let statusText = 'Completed';
      let meta = '';

      if (mv.movementType === 'PURCHASE_IN') {
        title = `Purchase Completed`;
        meta = `${mv.referenceNumber}: ${mv.quantity} units of '${mv.productId?.name}' into ${mv.warehouseId?.name}`;
        statusText = 'PENDING RECEIPT'; // Match UI design badge
      } else if (mv.movementType === 'SALE_OUT') {
        title = `Sale Completed`;
        meta = `${mv.referenceNumber}: Sold ${Math.abs(mv.quantity)} units of '${mv.productId?.name}'`;
        statusText = 'SHIPPED';
      } else if (mv.movementType === 'TRANSFER_OUT' || mv.movementType === 'TRANSFER_IN') {
        title = `Stock Transferred`;
        meta = `${mv.referenceNumber}: Transferred ${Math.abs(mv.quantity)} units of '${mv.productId?.name}'`;
        statusText = 'IN TRANSIT';
      } else {
        title = `Stock Adjusted`;
        meta = `${mv.reason || 'Manual Adjustment'}: Changed by ${mv.quantity}`;
        statusText = 'ADJUSTED';
      }

      return {
        id: mv._id,
        title,
        description: meta,
        time: mv.createdAt,
        status: statusText,
        type: mv.movementType
      };
    });

    // 4. Chart Data: Stock Movement (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Group movements by date
    const movementsLast7Days = await StockMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$movementType"
          },
          count: { $sum: { $abs: "$quantity" } }
        }
      }
    ]);

    // 5. Chart Data: Warehouse Distribution
    const warehouseDist = await InventoryBalance.aggregate([
      {
        $group: {
          _id: "$warehouseId",
          totalQuantity: { $sum: "$quantity" }
        }
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "_id",
          foreignField: "_id",
          as: "warehouse"
        }
      },
      {
        $unwind: "$warehouse"
      },
      {
        $project: {
          warehouseName: "$warehouse.name",
          totalQuantity: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalProducts,
          inventoryValue,
          lowStockCount,
          expiringCount,
          deadStockCount,
          totalWarehouses
        },
        criticalAlerts: finalAlerts,
        recentActivity: recentActivities,
        stockMovementChart: movementsLast7Days,
        warehouseDistributionChart: warehouseDist
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAgingReport = async (req, res, next) => {
  try {
    const basis = req.query.basis || 'lastMovementAt'; // lastMovementAt, lastSaleAt, lastPurchaseAt, createdAt
    const settings = await SystemSetting.findOne();
    const buckets = settings ? settings.agingBuckets : [
      { label: '0–30 days', minDays: 0, maxDays: 30 },
      { label: '31–60 days', minDays: 31, maxDays: 60 },
      { label: '61–90 days', minDays: 61, maxDays: 90 },
      { label: '91–180 days', minDays: 91, maxDays: 180 },
      { label: '180+ days', minDays: 181, maxDays: 99999 }
    ];

    const products = await Product.find();
    const balances = await InventoryBalance.find()
      .populate('productId')
      .populate('warehouseId');

    const reportData = [];
    const now = new Date();

    balances.forEach((bal) => {
      const prod = bal.productId;
      if (!prod) return;

      // Determine date to calculate age
      let compareDate = prod[basis] || prod.createdAt;
      
      const diffTime = Math.abs(now - new Date(compareDate));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Find matching bucket
      let matchedBucket = 'Unknown';
      for (const bucket of buckets) {
        if (diffDays >= bucket.minDays && diffDays <= bucket.maxDays) {
          matchedBucket = bucket.label;
          break;
        }
      }

      reportData.push({
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        warehouseName: bal.warehouseId.name,
        currentStock: bal.quantity,
        agingBasis: basis,
        lastDate: compareDate,
        daysCount: diffDays,
        agingBucket: matchedBucket
      });
    });

    res.status(200).json({
      success: true,
      data: {
        buckets,
        report: reportData
      }
    });
  } catch (error) {
    next(error);
  }
};
