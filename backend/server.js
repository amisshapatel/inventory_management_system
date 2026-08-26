import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/error.js';

// Route Imports
import authRoutes from './modules/auth/routes.js';
import userRoutes from './modules/users/routes.js';
import productRoutes from './modules/products/routes.js';
import warehouseRoutes from './modules/warehouses/routes.js';
import inventoryRoutes from './modules/inventory/routes.js';
import purchaseRoutes from './modules/purchases/routes.js';
import saleRoutes from './modules/sales/routes.js';
import transferRoutes from './modules/transfers/routes.js';
import importRoutes from './modules/imports/routes.js';
import exportRoutes from './modules/exports/routes.js';
import reportRoutes from './modules/reports/routes.js';
import settingsRoutes from './modules/settings/routes.js';

dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static generated transfer PDFs
app.use(express.static(path.join(process.cwd(), 'public')));

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

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please close the other process or use a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});


