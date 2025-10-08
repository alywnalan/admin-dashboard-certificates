import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import certificateRoutes from './routes/certificates.js';
import authRoutes from './routes/auth.js';
import instituteRoutes from './routes/institute.js';
import statsRoutes from './routes/stats.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { initIO } from './realtime.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/stats', statsRoutes);

// Static serving for frontend and public assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, '../frontend');
const publicDir = path.join(__dirname, '../public');
app.use('/public', express.static(publicDir));
app.use(express.static(frontendDir));

// Fallback to dashboard or index if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin-dashboard.html'));
});

// Route for password reset page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin-reset-password.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected...');
  initIO(server);
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => console.error('❌ DB Connection Error:', err));
