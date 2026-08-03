import Warehouse from './model.js';
import InventoryBalance from '../inventory/balanceModel.js';

export const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: warehouses });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseById = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      res.status(404);
      throw new Error('Warehouse not found');
    }
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, address, status } = req.body;

    if (!name || !code) {
      res.status(400);
      throw new Error('Please enter warehouse name and unique code');
    }

    const exists = await Warehouse.findOne({ code });
    if (exists) {
      res.status(400);
      throw new Error(`Warehouse with code '${code}' already exists`);
    }

    const warehouse = await Warehouse.create({
      name,
      code,
      address,
      status: status || 'Active'
    });

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const { name, code, address, status } = req.body;
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      res.status(404);
      throw new Error('Warehouse not found');
    }

    if (code && code !== warehouse.code) {
      const exists = await Warehouse.findOne({ code });
      if (exists) {
        res.status(400);
        throw new Error(`Warehouse with code '${code}' already exists`);
      }
      warehouse.code = code;
    }

    if (name) warehouse.name = name;
    if (address !== undefined) warehouse.address = address;
    if (status) warehouse.status = status;

    await warehouse.save();
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) {
    next(error);
  }
};

export const deleteWarehouse = async (req, res, next) => {
  try {
    const warehouseId = req.params.id;
    const warehouse = await Warehouse.findById(warehouseId);

    if (!warehouse) {
      res.status(404);
      throw new Error('Warehouse not found');
    }

    // Check if warehouse has stock balances > 0
    const stockExists = await InventoryBalance.findOne({
      warehouseId,
      quantity: { $gt: 0 }
    });

    if (stockExists) {
      res.status(400);
      throw new Error('Cannot delete warehouse with active positive stock balances. Transfer items first.');
    }

    // Clean up empty balance records for this warehouse
    await InventoryBalance.deleteMany({ warehouseId });

    await Warehouse.findByIdAndDelete(warehouseId);
    res.status(200).json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    next(error);
  }
};
