import dns from 'node:dns';
import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import 'dotenv/config';
import { UPLOADS_DIR } from './utils/coverStorage.js';

import connectDB from './config/db.js';
import { globalErrorHandler, notFound } from './middleware/errorMiddleware.js';
import { sanitizeInput } from './middleware/validateMiddleware.js';
import { apiLimiter, authLimiter, adminLimiter, paymentLimiter } from './middleware/rateLimiter.js';
import { csrfProtection } from './utils/csrf.js';

import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

// Fail fast in production when critical configuration is missing or weak.
// Running with a default JWT secret or no database credentials is a silent
// security failure, so we refuse to boot instead.
if (process.env.NODE_ENV === 'production') {
  const problems = [];
  if (!process.env.MONGO_URI) problems.push('MONGO_URI is not set');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET is missing or shorter than 32 characters');
  }
  const origins = [process.env.CLIENT_URL, process.env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((url) => String(url).split(','))
    .map((o) => o.trim())
    .filter(Boolean);
  if (!origins.length) problems.push('CLIENT_URL or FRONTEND_URL must be set for production CORS');
  if (problems.length) {
    console.error(`Refusing to start in production:\n - ${problems.join('\n - ')}`);
    process.exit(1);
  }
}

// Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
// HSTS in production, and more). /uploads images are consumed cross-origin by
// the SPA in development, so CORP stays cross-origin; everything else keeps
// helmet's strict defaults including a default-src 'self' CSP.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration. Explicitly allow known origins + CLIENT_URL/FRONTEND_URL env.
// Credentials enabled, so no wildcard origin. Preflight handled for all routes.
const envOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((url) => String(url).split(','))
  .map((url) => url.trim())
  .filter(Boolean);
const allowedOrigins = [
  'https://anime-bookstore-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  ...envOrigins,
];
const effectiveOrigins = [...new Set(allowedOrigins)];
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin) and explicitly allowed origins.
    if (!origin || effectiveOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing. Raw JSON is required for Stripe webhook signature verification.
// Limits are small: every large payload in this app is an image with its own
// raw-parser limit mounted on the specific route.
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '256kb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// CSRF protection for cookie-authenticated mutating requests. Bearer-token
// requests and pre-session auth endpoints are exempt (see utils/csrf.js).
app.use(csrfProtection);

// Input sanitization
app.use(sanitizeInput);

// Rate limiting. Trust the proxy so X-Forwarded-For is honoured in production
// (needed for the limiter to see the real client IP).
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use('/api/auth', authLimiter);
app.use('/api/admin/dashboard', adminLimiter);
app.use('/api/payments', paymentLimiter);
app.use('/api', apiLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Admin-uploaded cover images. Filenames are random UUIDs, so they can be cached hard.
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '30d',
  immutable: true,
  fallthrough: false,
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: 'Backend is running',
    database: databaseConnected ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', contactRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

  // In production the API must not start without a database. In development we
  // allow a degraded start so local work can continue, but the health check reports it.
  const PORT = Number(process.env.PORT) || 5000;
  const HOST = '0.0.0.0';
  const startServer = async () => {
    console.log('Loading environment variables...');
    console.log(`Runtime: NODE_ENV=${process.env.NODE_ENV || 'development'}, PORT=${process.env.PORT || '(default 5000)'}, MONGO_URI=${process.env.MONGO_URI ? 'set' : 'MISSING'}`);
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB connection failed:', {
        name: err?.name,
        message: err?.message,
      });
      if (err?.stack) console.error(err.stack);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      console.warn('Starting server in degraded mode (development only).');
    }

    const server = app.listen(PORT, HOST, () => {
      console.log(`Backend Server Running on ${HOST}:${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
      console.log('Health check: /api/health');
    });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
