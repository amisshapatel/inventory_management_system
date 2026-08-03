import Product from './model.js';
import CustomFieldDefinition from './customFieldModel.js';

// Helper function to validate dynamic custom fields
const validateCustomFields = async (customFieldsData) => {
  const definitions = await CustomFieldDefinition.find();
  const validated = {};

  for (const def of definitions) {
    const value = customFieldsData ? customFieldsData[def.key] : undefined;

    // Check required constraint
    if (def.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Custom field '${def.label}' is required`);
    }

    if (value !== undefined && value !== null && value !== '') {
      // Validate by type
      if (def.type === 'Number') {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Custom field '${def.label}' must be a valid number`);
        }
        validated[def.key] = num;
      } else if (def.type === 'Date') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Custom field '${def.label}' must be a valid date`);
        }
        validated[def.key] = date;
      } else if (def.type === 'Boolean') {
        validated[def.key] = value === true || value === 'true';
      } else if (def.type === 'Dropdown') {
        if (def.options && def.options.length > 0 && !def.options.includes(value)) {
          throw new Error(`Custom field '${def.label}' must be one of: ${def.options.join(', ')}`);
        }
        validated[def.key] = value;
      } else {
        // Text type
        validated[def.key] = String(value).trim();
      }
    }
  }

  return validated;
};

// --- Product Controllers ---

export const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const status = req.query.status || '';

    // Build filter query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }

    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count,
      page,
      pages: Math.ceil(count / limit),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category, unit, description, status, minimumStock, customFields } = req.body;

    if (!name || !sku || !category || !unit) {
      res.status(400);
      throw new Error('Please enter all required fields: name, sku, category, unit');
    }

    const exists = await Product.findOne({ sku });
    if (exists) {
      res.status(400);
      throw new Error(`Product with SKU '${sku}' already exists`);
    }

    // Dynamic fields validation
    const validatedCustomFields = await validateCustomFields(customFields);

    const product = await Product.create({
      name,
      sku,
      category,
      unit,
      description,
      status: status || 'Active',
      minimumStock: minimumStock || 0,
      customFields: validatedCustomFields
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { name, sku, category, unit, description, status, minimumStock, customFields } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (sku && sku !== product.sku) {
      const exists = await Product.findOne({ sku });
      if (exists) {
        res.status(400);
        throw new Error(`Product with SKU '${sku}' already exists`);
      }
      product.sku = sku;
    }

    if (name) product.name = name;
    if (category) product.category = category;
    if (unit) product.unit = unit;
    if (description !== undefined) product.description = description;
    if (status) product.status = status;
    if (minimumStock !== undefined) product.minimumStock = minimumStock;

    if (customFields) {
      product.customFields = await validateCustomFields(customFields);
    }

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    // Delete the product
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Custom Field Definition Controllers ---

export const getCustomFieldDefinitions = async (req, res, next) => {
  try {
    const fields = await CustomFieldDefinition.find();
    res.status(200).json({ success: true, data: fields });
  } catch (error) {
    next(error);
  }
};

export const createCustomFieldDefinition = async (req, res, next) => {
  try {
    const { label, key, type, required, showInList, options } = req.body;

    if (!label || !key || !type) {
      res.status(400);
      throw new Error('Please provide label, key, and type');
    }

    // Convert key to lowercase alphanumeric to ensure consistent DB usage
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

    const exists = await CustomFieldDefinition.findOne({ key: cleanKey });
    if (exists) {
      res.status(400);
      throw new Error(`Custom field with key '${cleanKey}' already exists`);
    }

    const field = await CustomFieldDefinition.create({
      label,
      key: cleanKey,
      type,
      required: !!required,
      showInList: showInList === undefined ? true : !!showInList,
      options: options || []
    });

    res.status(201).json({ success: true, data: field });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomFieldDefinition = async (req, res, next) => {
  try {
    const field = await CustomFieldDefinition.findById(req.params.id);
    if (!field) {
      res.status(404);
      throw new Error('Custom field definition not found');
    }

    // Clean up all products: remove this custom field key
    await Product.updateMany(
      {},
      { $unset: { [`customFields.${field.key}`]: '' } }
    );

    await CustomFieldDefinition.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Custom field '${field.label}' deleted and cleaned from all products`
    });
  } catch (error) {
    next(error);
  }
};
