import express from 'express';
import Certificate from '../models/Certificate.js';
import {
  createCertificate,
  getCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
  validateCertificate,
  bulkValidateCertificates,
  // new controller we will implement later
  batchGenerateCertificates,
  getAllCertificatesDatabase,
  exportCertificatesData,
  getCertificateStats,
  generateCertificateWithQR,
  analyzeCertificateImage,
  verifyBlockchainTransaction,
  clearAllCertificates
} from '../controllers/certificateController.js';

const router = express.Router();

// Create certificate
router.post('/', createCertificate);

// Generate certificate with QR code
router.post('/generate-with-qr', generateCertificateWithQR);

// AI-Powered Certificate Image Analysis
router.post('/analyze-image', analyzeCertificateImage);

// Blockchain Verification
router.post('/verify-blockchain', verifyBlockchainTransaction);

// Get all certificates with pagination and filtering
router.get('/', getCertificates);

// Enhanced database interface for all certificates
router.get('/database', getAllCertificatesDatabase);

// Export certificates data
router.post('/export', exportCertificatesData);

// Get certificate statistics
router.get('/stats', getCertificateStats);

// ✅ Validate by UUID (keep this ABOVE /:id route)
router.get('/validate/:uuid', validateCertificate);

// Bulk validate certificates
router.post('/bulk-validate', bulkValidateCertificates);

// Batch generate certificates from uploaded data (CSV/XLSX) and selected template
router.post('/batch-generate', batchGenerateCertificates);

// Clear all certificates (admin-only)
router.delete('/clear', clearAllCertificates);

// Get by ID
router.get('/:id', getCertificateById);

// Update by ID
router.put('/:id', updateCertificate);

// Delete by ID
router.delete('/:id', deleteCertificate);

console.log("✅ Enhanced certificates route loaded");

export default router;
