import Product from '../products/model.js';
import InventoryBalance from '../inventory/balanceModel.js';
import CustomFieldDefinition from '../products/customFieldModel.js';

export const exportProducts = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ sku: 1 });
    const customDefs = await CustomFieldDefinition.find();
    
    // Fetch all stock balances to map warehouse-wise stock
    const balances = await InventoryBalance.find()
      .populate('warehouseId', 'code name');

    // CSV Headers
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Unit',
      'Description',
      'Minimum Stock',
      'Status',
      'Warehouse Stocks'
    ];

    // Append custom fields to headers
    customDefs.forEach(def => {
      headers.push(def.label);
    });

    const csvRows = [headers.join(',')];

    products.forEach((prod) => {
      // Find warehouse balances for this product
      const prodBalances = balances.filter(b => b.productId.toString() === prod._id.toString());
      const stockString = prodBalances
        .map(b => `${b.warehouseId.code}:${b.quantity}`)
        .join('|'); // Format: WH01:45|WH02:30

      const row = [
        escapeCSV(prod.sku),
        escapeCSV(prod.name),
        escapeCSV(prod.category),
        escapeCSV(prod.unit),
        escapeCSV(prod.description),
        prod.minimumStock.toString(),
        prod.status,
        escapeCSV(stockString)
      ];

      // Add custom fields in the order of customDefs
      customDefs.forEach((def) => {
        const val = prod.customFields ? prod.customFields.get(def.key) : '';
        let displayVal = '';
        if (val !== undefined && val !== null) {
          if (def.type === 'Date') {
            displayVal = new Date(val).toLocaleDateString();
          } else {
            displayVal = String(val);
          }
        }
        row.push(escapeCSV(displayVal));
      });

      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=stockpilot_products_export.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// Helper function to escape CSV characters
const escapeCSV = (str) => {
  if (str === null || str === undefined) return '';
  const text = String(str);
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};
