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
  getCertificateStats,
  generateCertificateWithQR,
  analyzeCertificateImage,
  verifyBlockchainTransaction
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

// Get certificate statistics
router.get('/stats', getCertificateStats);

// Debug endpoint to check all certificates
router.get('/debug/all', async (req, res) => {
  try {
    console.log('🔍 Debug: Fetching all certificates...');
    const certificates = await Certificate.find({}).select('uuid student course institute generatedByAdmin createdAt').limit(20);
    console.log('🔍 Debug: Found certificates:', certificates.length);
    console.log('🔍 Debug: Certificates:', certificates);
    res.json({
      count: certificates.length,
      certificates: certificates
    });
  } catch (err) {
    console.error('❌ Debug: Error fetching certificates:', err);
    res.status(500).json({ message: 'Error fetching certificates', error: err.message });
  }
});

// Test endpoint to create and immediately validate a certificate
router.get('/debug/test', async (req, res) => {
  try {
    console.log('🧪 Debug: Creating test certificate...');
    
    // Create a test certificate
    const testUUID = 'test-' + Date.now();
    const testCert = new Certificate({
      uuid: testUUID,
      student: 'Test Student',
      course: 'Test Course',
      institute: 'Test Institute',
      date: new Date().toISOString().split('T')[0],
      issued: true,
      generatedByAdmin: true,
      createdAt: new Date()
    });
    
    await testCert.save();
    console.log('✅ Test certificate created:', testUUID);
    
    // Immediately try to validate it
    const foundCert = await Certificate.findOne({ uuid: testUUID });
    console.log('🔍 Test certificate found:', foundCert ? 'Yes' : 'No');
    
    res.json({
      success: true,
      created: testUUID,
      found: !!foundCert,
      certificate: foundCert
    });
  } catch (err) {
    console.error('❌ Debug test error:', err);
    res.status(500).json({ message: 'Debug test failed', error: err.message });
  }
});

// ✅ Validate by UUID (keep this ABOVE /:id route)
router.get('/validate/:uuid', validateCertificate);

// Bulk validate certificates
router.post('/bulk-validate', bulkValidateCertificates);

// Get by ID
router.get('/:id', getCertificateById);

// Update by ID
router.put('/:id', updateCertificate);

// Delete by ID
router.delete('/:id', deleteCertificate);

console.log("✅ Enhanced certificates route loaded");

export default router;
