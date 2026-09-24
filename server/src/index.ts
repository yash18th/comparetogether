import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { seedDatabase } from './db/seed.js';
import { db } from './db/database.js';
import { AdapterRegistry } from './adapters/AdapterRegistry.js';

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

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://comparetogether.vercel.app',
  'https://comparetogether.in',
  'https://www.comparetogether.in',
  process.env.CORS_ORIGIN
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json());

// Initialize & Seed Database safely
seedDatabase();

import comparisonRoutes from './routes/comparison.js';

// Route Mounts
app.use('/api/search', searchRoutes);
app.use('/api/compare', comparisonRoutes);
app.use('/api/providers', comparisonRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations/swiggy', swiggyRoutes);

// Step 4 OAuth routes specification aliases: /auth/swiggy/*
app.get('/auth/swiggy/start', (req, res) => res.redirect('/api/integrations/swiggy/connect'));
app.get('/auth/swiggy/callback', (req, res) => res.redirect(`/api/integrations/swiggy/callback?${new URLSearchParams(req.query as any).toString()}`));
app.get('/auth/swiggy/status', (req, res) => res.redirect('/api/integrations/swiggy/status'));
app.post('/auth/swiggy/logout', (req, res) => res.redirect(307, '/api/integrations/swiggy/disconnect'));

// Health check handler with DB and provider status verification
const getHealthStatus = () => {
  let dbStatus = 'healthy';
  try {
    db.prepare('SELECT 1').get();
  } catch (err: any) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  let providers: any[] = [];
  try {
    const registry = AdapterRegistry.getInstance();
    providers = registry.getSupportedPlatforms().map(p => ({
      code: p.code,
      name: p.name,
      status: 'AVAILABLE'
    }));
  } catch (err) {
    providers = [];
  }

  const isHealthy = dbStatus === 'healthy';

  return {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'FoodCompare',
    version: '1.0.0',
    database: dbStatus,
    providers,
    timestamp: new Date().toISOString()
  };
};

app.get('/health', (req, res) => {
  const health = getHealthStatus();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.get('/api/health', (req, res) => {
  const health = getHealthStatus();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 FoodCompare backend running on http://0.0.0.0:${PORT}`);
});
