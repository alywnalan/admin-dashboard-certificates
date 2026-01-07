import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import certificateRoutes from './routes/certificates.js';
import authRoutes from './routes/auth.js';
import instituteRoutes from './routes/institute.js';
import statsRoutes from './routes/stats.js';
import templateRoutes from './routes/templates.js';
import studentRoutes from './routes/students.js';
import courseRoutes from './routes/courses.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import jwt from 'jsonwebtoken';
import { initIO } from './realtime.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.options('*', cors()); // respond to preflight requests
app.use(express.json());

// Simple request logging for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

// Debug route to list registered routes (temporary)
app.get('/_debug/routes', (req, res) => {
  try {
    const result = [];
    app._router.stack.forEach((m) => {
      if (m.route && m.route.path) {
        const methods = Object.keys(m.route.methods).map(s => s.toUpperCase()).join(',');
        result.push({ path: m.route.path, methods });
      }
    });
    res.json({ routes: result });
  } catch (e) {
    res.status(500).json({ error: 'failed to list routes' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);

// Static serving for frontend and public assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve frontend from backend/frontend (single canonical frontend folder)
const frontendDir = path.join(__dirname, 'frontend');
const publicDir = path.join(__dirname, '../public');
app.use('/public', express.static(publicDir));
app.use(express.static(frontendDir));

// Fallback to dashboard or index if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Helper: simple cookie parser to avoid adding a new dependency
function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const pairs = c.split(';').map(p => p.trim()).filter(Boolean);
  for (const pair of pairs) {
    const parts = pair.split('=');
    if (parts[0] === name) return decodeURIComponent(parts.slice(1).join('='));
  }
  return null;
}

function adminGuard(req, res, next) {
  // Try Authorization header first
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) token = getCookie(req, 'admin_token');
  if (!token) {
    return res.redirect('/auth.html?role=admin&mode=login');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // attach minimal admin info for downstream handlers if needed
    req.admin = { id: decoded.id, username: decoded.username, email: decoded.email };
    return next();
  } catch (e) {
    return res.redirect('/auth.html?role=admin&mode=login');
  }
}

app.get('/admin', adminGuard, (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin-dashboard.html'));
});

// Ensure direct access to admin-dashboard.html is also guarded
app.get('/admin-dashboard.html', adminGuard, (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin-dashboard.html'));
});

// Route for password reset page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin-reset-password.html'));
});

// MongoDB Connection
console.log('📝 Attempting to connect to MongoDB:', process.env.MONGO_URI?.substring(0, 50) + '...');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected...');
  initIO(server);
  
  // Ensure server listens with a small delay to prevent early exit
  setImmediate(() => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
}).catch(err => console.error('❌ DB Connection Error:', err));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit—keep server running
});
