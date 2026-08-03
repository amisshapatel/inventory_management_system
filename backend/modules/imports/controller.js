import { parseCSV } from '../../utils/csvParser.js';
import Product from '../products/model.js';
import Warehouse from '../warehouses/model.js';
import CustomFieldDefinition from '../products/customFieldModel.js';
import { adjustStock } from '../inventory/service.js';
import mongoose from 'mongoose';

// Endpoint 1: Upload CSV and extract raw headers and preview rows
export const previewUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a CSV file');
    }

    const csvText = req.file.buffer.toString('utf-8');
    const { headers, rows } = parseCSV(csvText);

    res.status(200).json({
      success: true,
      data: {
        headers,
        totalRows: rows.length,
        previewRows: rows.slice(0, 5) // Return first 5 rows for sample preview
      }
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint 2: Validate rows based on chosen column mapping
export const validateMappedData = async (req, res, next) => {
  try {
    const { rows, mapping } = req.body; // mapping = { sku: 'SKU Header', name: 'Name Header', ... }

    if (!rows || !mapping) {
      res.status(400);
      throw new Error('Missing rows or mapping schema configuration');
    }

    const customFieldDefs = await CustomFieldDefinition.find();
    const customFieldsKeys = customFieldDefs.map(d => d.key);

    const validationResult = [];
    const processedSkus = new Set();

    // Fetch existing SKUs and warehouses from DB to optimize checks
    const existingProducts = await Product.find().select('sku');
    const dbSkus = new Set(existingProducts.map(p => p.sku));

    const dbWarehouses = await Warehouse.find({ status: 'Active' });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const errors = [];
      const warnings = [];

      // Extract values based on mapping
      const sku = row[mapping.sku] ? String(row[mapping.sku]).trim() : '';
      const name = row[mapping.name] ? String(row[mapping.name]).trim() : '';
      const category = row[mapping.category] ? String(row[mapping.category]).trim() : '';
      const unit = row[mapping.unit] ? String(row[mapping.unit]).trim() : '';
      const description = row[mapping.description] ? String(row[mapping.description]).trim() : '';
      
      const minStockRaw = row[mapping.minimumStock];
      const minStock = minStockRaw !== undefined && minStockRaw !== '' ? Number(minStockRaw) : 0;

      const openingStockRaw = row[mapping.openingStock];
      const openingStock = openingStockRaw !== undefined && openingStockRaw !== '' ? Number(openingStockRaw) : 0;
      
      const warehouseCode = row[mapping.warehouseCode] ? String(row[mapping.warehouseCode]).trim() : '';

      // Extracted custom fields
      const customFields = {};
      customFieldDefs.forEach(def => {
        const header = mapping[def.key];
        if (header && row[header] !== undefined) {
          customFields[def.key] = row[header];
        }
      });

      // Validations
      if (!name) errors.push('Missing product name');
      if (!sku) errors.push('Missing SKU');
      
      if (sku) {
        if (processedSkus.has(sku)) {
          errors.push(`Duplicate SKU '${sku}' inside the uploaded file`);
        } else {
          processedSkus.add(sku);
        }

        if (dbSkus.has(sku)) {
          errors.push(`SKU '${sku}' already exists in the database`);
        }
      }

      if (isNaN(minStock) || minStock < 0) {
        errors.push('Minimum stock must be a non-negative number');
      }

      if (openingStock < 0) {
        errors.push('Opening stock cannot be negative');
      }

      let selectedWarehouseId = null;
      if (openingStock > 0) {
        if (!warehouseCode) {
          errors.push('Warehouse code is required if opening stock is specified');
        } else {
          const matchWh = dbWarehouses.find(w => w.code.toLowerCase() === warehouseCode.toLowerCase());
          if (!matchWh) {
            errors.push(`Warehouse with code '${warehouseCode}' not found or is inactive`);
          } else {
            selectedWarehouseId = matchWh._id;
          }
        }
      }

      // Dynamic custom fields validation check
      for (const def of customFieldDefs) {
        const val = customFields[def.key];
        if (def.required && (val === undefined || val === null || val === '')) {
          errors.push(`Custom field '${def.label}' is required`);
        }
        if (val !== undefined && val !== null && val !== '') {
          if (def.type === 'Number' && isNaN(Number(val))) {
            errors.push(`Custom field '${def.label}' must be a number`);
          } else if (def.type === 'Date' && isNaN(new Date(val).getTime())) {
            errors.push(`Custom field '${def.label}' must be a valid date`);
          }
        }
      }

      validationResult.push({
        rowIndex: i + 1,
        isValid: errors.length === 0,
        errors,
        warnings,
        mappedProduct: {
          name,
          sku,
          category: category || 'General',
          unit: unit || 'Pcs',
          description,
          minimumStock: isNaN(minStock) ? 0 : minStock,
          openingStock: isNaN(openingStock) ? 0 : openingStock,
          warehouseId: selectedWarehouseId,
          warehouseCode,
          customFields
        }
      });
    }

    res.status(200).json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint 3: Commit import list to the database
export const commitImport = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { items } = req.body; // Array of mappedProduct items

    if (!items || items.length === 0) {
      res.status(400);
      throw new Error('No valid import products provided');
    }

    const importedList = [];

    for (const item of items) {
      // 1. Create the product
      const product = await Product.create([{
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        description: item.description,
        minimumStock: item.minimumStock,
        customFields: item.customFields,
        lastMovementAt: item.openingStock > 0 ? new Date() : null
      }], { session });

      const newProduct = product[0];

      // 2. Load stock if openingStock > 0
      if (item.openingStock > 0 && item.warehouseId) {
        await adjustStock({
          productId: newProduct._id,
          warehouseId: item.warehouseId,
          quantityChange: item.openingStock,
          movementType: 'IMPORT_OPENING_STOCK',
          reason: 'Initial CSV opening stock import',
          referenceType: 'Import',
          referenceId: newProduct._id,
          referenceNumber: 'CSV-IMPORT',
          createdBy: req.user._id,
          session
        });
      }

      importedList.push(newProduct);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${importedList.length} products`,
      count: importedList.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
