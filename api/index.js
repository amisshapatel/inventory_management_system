import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import backend modules
import { connectDB } from '../backend/config/db.js';
import { errorHandler } from '../backend/middleware/error.js';

// Route Imports
import authRoutes from '../backend/modules/auth/routes.js';
import userRoutes from '../backend/modules/users/routes.js';
import productRoutes from '../backend/modules/products/routes.js';
import warehouseRoutes from '../backend/modules/warehouses/routes.js';
import inventoryRoutes from '../backend/modules/inventory/routes.js';
import purchaseRoutes from '../backend/modules/purchases/routes.js';
import saleRoutes from '../backend/modules/sales/routes.js';
import transferRoutes from '../backend/modules/transfers/routes.js';
import importRoutes from '../backend/modules/imports/routes.js';
import exportRoutes from '../backend/modules/exports/routes.js';
import reportRoutes from '../backend/modules/reports/routes.js';
import settingsRoutes from '../backend/modules/settings/routes.js';

dotenv.config();

// Connect to MongoDB Database
let dbConnected = false;
const ensureDBConnected = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static generated transfer PDFs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../backend/public')));

// Register Module REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Root test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'StockPilot Inventory System API' });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Vercel serverless function handler
export default async (req, res) => {
  await ensureDBConnected();
  return app(req, res);
};
