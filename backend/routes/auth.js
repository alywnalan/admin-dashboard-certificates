import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { recordFailedLogin, getIO } from '../realtime.js';
import { addSession, listSessionsForAdmin, revokeBySessionId, revokeByTokenId } from '../sessions.js';
import Admin from '../models/Admin.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Admin login (supports username or email)
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if ((!username && !email) || !password) {
      return res.status(400).json({ message: 'Username or email and password required.' });
    }
    const query = username ? { username } : { email };
    const admin = await Admin.findOne(query);
    if (!admin) {
      recordFailedLogin();
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      recordFailedLogin();
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    // Create a token with a jti for session tracking
    const tokenId = Math.random().toString(36).slice(2);
    const token = jwt.sign({ id: admin._id, username: admin.username, email: admin.email, jti: tokenId }, process.env.JWT_SECRET, { expiresIn: '2h' });
    // Register session
    addSession({ 
      tokenId,
      adminId: String(admin._id),
      username: admin.username,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    // Optional: emit security login success event
    const io = getIO();
    if (io) io.emit('security:loginSuccess', { at: new Date().toISOString(), admin: admin.username });
    res.json({ token, admin: { username: admin.username, email: admin.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin registration (for initial setup, can be removed later)
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ message: 'All fields required.' });
    const exists = await Admin.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(409).json({ message: 'Username or email already exists.' });
    const hash = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, password: hash, email });
    await admin.save();
    res.status(201).json({ message: 'Admin registered.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password - generate reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    
    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { id: admin._id, email: admin.email, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Store reset token in admin document (you might want to add a resetToken field to Admin model)
    // For now, we'll simulate sending the email
    
    // In a real application, you would:
    // 1. Save the reset token to the database
    // 2. Send an email with the reset link
    // 3. The reset link would contain the token
    
    console.log(`Password reset requested for ${email}. Reset token: ${resetToken}`);
    
    res.json({ 
      message: 'Password reset link sent to your email!',
      resetToken: resetToken // Remove this in production - only for testing
    });
    
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }
    
    // Verify the reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token.' });
    }
    
    // Find admin and update password
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(400).json({ message: 'Invalid reset token.' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();
    
    res.json({ message: 'Password has been reset successfully!' });
    
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid reset token.' });
    }
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Optional: simple logout route for client semantics
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.jti) revokeByTokenId(decoded.jti);
      } catch {}
    }
    return res.json({ message: 'Logged out' });
  } catch {
    return res.json({ message: 'Logged out' });
  }
});

// List active sessions for current admin
router.get('/sessions', auth, (req, res) => {
  try {
    const sessions = listSessionsForAdmin(String(req.admin.id));
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// Revoke a session by sessionId
router.delete('/sessions/:sessionId', auth, (req, res) => {
  try {
    const ok = revokeBySessionId(String(req.admin.id), req.params.sessionId);
    if (!ok) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session revoked' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to revoke session' });
  }
});

export default router;
