import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, phone, institute } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const existing = await Student.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const student = new Student({ name, email, password: hash, phone, institute });
    await student.save();

    // Auto-verify accounts: email verification not required
    try {
      student.isVerified = true;
      student.verificationSentAt = new Date();
      await student.save();
    } catch (err) {
      console.error('Auto-verify error:', err);
    }
    
    return res.status(201).json({ 
      success: true,
      message: 'Student registered successfully. A verification email has been sent (check logs if SMTP not configured).',
      student: { id: student._id, name: student.name, email: student.email }
    });
  } catch (err) {
    console.error('Register student error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const student = await Student.findOne({ email });
    if (!student) return res.status(401).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });



    const token = jwt.sign({ id: student._id, email: student.email, name: student.name, role: 'student', type: 'student_auth' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, student: { id: student._id, name: student.name, email: student.email } });
  } catch (err) {
    console.error('Login student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send verification email (resend)
export const sendVerification = async (req, res) => {
  // Email verification is disabled — nothing to do
  return res.status(400).json({ message: 'Email verification is not required in this deployment.' });
};

export const verifyEmail = async (req, res) => {
  // Verification endpoint is disabled; accounts are auto-verified on registration
  return res.status(400).json({ message: 'Email verification is not required in this deployment.' });
};

// Student: forgot password (request reset link)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const student = await Student.findOne({ email });
    if (!student) {
      // Do not reveal account existence
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    const resetToken = jwt.sign({ id: student._id, email: student.email, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/auth.html?reset=${encodeURIComponent(resetToken)}&role=student`;

    // Send email or log
    if (process.env.SMTP_HOST) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: student.email,
          subject: 'Password reset',
          text: `Reset your password: ${resetUrl}`,
          html: `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p>`
        });
      } catch (mailErr) {
        console.error('Failed to send password reset email:', mailErr);
        console.log('Password reset link (fallback):', resetUrl);
      }
    } else {
      console.log('Password reset link:', resetUrl);
    }

    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Student: reset password using token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required.' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }
    if (decoded.type !== 'password_reset') return res.status(400).json({ message: 'Invalid token.' });
    const student = await Student.findById(decoded.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const hash = await bcrypt.hash(newPassword, 10);
    student.password = hash;
    await student.save();
    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ student });
  } catch (err) {
    console.error('Get student profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get certificates for current student
export const getMyCertificates = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Prefer metadata.studentEmail if present, fallback to student.name
    const email = student.email;
    const certificates = await Certificate.find({
      $or: [
        { 'metadata.studentEmail': email },
        { student: { $regex: student.name, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ certificates });
  } catch (err) {
    console.error('Get student certificates error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyCertificateById = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    // Ensure this certificate belongs to the student
    const belongs = (cert.metadata && cert.metadata.studentEmail === student.email) || (cert.student && cert.student.toLowerCase().includes(student.name.toLowerCase()));
    if (!belongs) return res.status(403).json({ message: 'Access denied to this certificate' });

    res.json({ certificate: cert });
  } catch (err) {
    console.error('Get student certificate by id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMyCertificate = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    // Check ownership
    const belongs = (cert.metadata && cert.metadata.studentEmail === student.email) || (cert.student && cert.student.toLowerCase().includes(student.name.toLowerCase()));
    if (!belongs) return res.status(403).json({ message: 'Access denied' });

    await cert.remove();
    res.json({ message: 'Certificate deleted' });
  } catch (err) {
    console.error('Delete student certificate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};