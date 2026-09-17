import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { seedDatabase } from './db/seed.js';

import searchRoutes from './routes/searchRoutes.js';
import compareRoutes from './routes/compareRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import swiggyRoutes from './routes/swiggyRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize & Seed Database
seedDatabase();

// Route Mounts
app.use('/api/search', searchRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations/swiggy', swiggyRoutes);


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FoodCompare API Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FoodCompare backend running on http://localhost:${PORT}`);
});
