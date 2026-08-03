import mongoose from 'mongoose';
import InventoryBalance from './balanceModel.js';
import StockMovement from './movementModel.js';
import Product from '../products/model.js';
import { SystemSetting } from '../settings/model.js';
import { triggerEmailAlert } from '../notifications/service.js';

/**
 * Adjust stock of a product in a warehouse.
 * This is the CENTRAL function that updates stock balances and creates movement history.
 */
export const adjustStock = async ({
  productId,
  warehouseId,
  quantityChange,
  movementType,
  reason = '',
  referenceType,
  referenceId = null,
  referenceNumber = '',
  createdBy,
  session = null // support mongoose transaction sessions
}) => {
  // 1. Fetch product to verify existence and check minimum stock
  const product = await Product.findById(productId).session(session);
  if (!product) {
    throw new Error(`Product not found with ID ${productId}`);
  }

  // 2. Fetch or create inventory balance
  let balance = await InventoryBalance.findOne({ productId, warehouseId }).session(session);
  const previousStock = balance ? balance.quantity : 0;
  const newStock = previousStock + quantityChange;

  // 3. Validate negative stock setting
  if (newStock < 0) {
    const settings = await SystemSetting.findOne().session(session);
    const allowNegative = settings ? settings.allowNegativeStock : false;
    if (!allowNegative) {
      throw new Error(`Insufficient stock for '${product.name}' in this warehouse. Available: ${previousStock}, requested adjustment: ${quantityChange}`);
    }
  }

  // 4. Update or create the balance
  if (!balance) {
    balance = new InventoryBalance({
      productId,
      warehouseId,
      quantity: newStock
    });
  } else {
    balance.quantity = newStock;
  }
  await balance.save({ session });

  // 5. Create stock movement record
  const movement = await StockMovement.create([{
    productId,
    warehouseId,
    movementType,
    quantity: quantityChange,
    previousStock,
    newStock,
    reason,
    referenceType,
    referenceId,
    referenceNumber,
    createdBy
  }], { session });

  // 6. Update product last movement date
  product.lastMovementAt = new Date();
  if (movementType === 'PURCHASE_IN') {
    product.lastPurchaseAt = new Date();
  } else if (movementType === 'SALE_OUT') {
    product.lastSaleAt = new Date();
  }
  await product.save({ session });

  // 7. Check low stock notification trigger (outside session/after commit to avoid blocking)
  if (newStock <= product.minimumStock) {
    // Fire email alert asynchronously (don't block the HTTP request)
    triggerEmailAlert('low_stock', {
      productName: product.name,
      sku: product.sku,
      currentStock: newStock,
      minimumStock: product.minimumStock,
      warehouseId
    }).catch(err => console.error('Error triggering low stock email:', err));
  }

  return movement[0];
};
