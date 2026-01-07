import express from 'express';
import * as studentController from '../controllers/studentController.js';
import studentAuth from '../middleware/studentAuth.js';

const router = express.Router();

router.post('/register', studentController.registerStudent);
router.post('/login', studentController.loginStudent);
router.post('/send-verification', studentController.sendVerification);
router.get('/verify/:token', studentController.verifyEmail);
router.post('/forgot-password', studentController.forgotPassword);
router.post('/reset-password', studentController.resetPassword);
router.get('/me', studentAuth, studentController.getProfile);

// Student certificate routes
router.get('/me/certificates', studentAuth, studentController.getMyCertificates);
router.get('/me/certificates/:id', studentAuth, studentController.getMyCertificateById);
router.delete('/me/certificates/:id', studentAuth, studentController.deleteMyCertificate);


// Expose courses endpoints for convenience (student-facing)
import courseRoutes from './courses.js';
router.use('/', courseRoutes);

export default router;
