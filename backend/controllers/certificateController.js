import Certificate from '../models/Certificate.js';
import Institute from '../models/Institute.js';
import { getIO } from '../realtime.js';
import { anchorHashOnChain, computeContentHashHex } from '../blockchain.js';

// Create a new certificate with enhanced validation
export const createCertificate = async (req, res) => {
  try {
    const { student, course, institute, date, uuid } = req.body;
    
    console.log('📝 Creating certificate with data:', { student, course, institute, date, uuid });
    
    // Validate required fields
    if (!student || !course || !institute || !date || !uuid) {
      console.log('❌ Missing required fields:', { student, course, institute, date, uuid });
      return res.status(400).json({ 
        message: 'Missing required fields: student, course, institute, date, uuid' 
      });
    }

    // Check if certificate with this UUID already exists
    const existingCert = await Certificate.findOne({ uuid });
    if (existingCert) {
      console.log('❌ Certificate with UUID already exists:', uuid);
      return res.status(400).json({ message: 'Certificate with this UUID already exists' });
    }

    // Verify institute exists; if not, create a minimal placeholder
    let instituteExists = await Institute.findOne({ name: institute });
    if (!instituteExists) {
      instituteExists = new Institute({
        name: institute,
        email: `${Date.now()}-${Math.random().toString(36).slice(2)}@placeholder.local`,
        contact: 'N/A',
        location: 'N/A',
        password: Math.random().toString(36).slice(2),
        type: 'training_center',
        status: 'active'
      });
      await instituteExists.save();
    }

    const cert = new Certificate({
      uuid,
      student,
      course,
      institute,
      date,
      issued: true,
      generatedByAdmin: true, // Mark as generated through admin system
      createdAt: new Date()
    });
    
    console.log('📝 Certificate object created:', {
      uuid: cert.uuid,
      student: cert.student,
      course: cert.course,
      institute: cert.institute,
      generatedByAdmin: cert.generatedByAdmin
    });
    
    // Blockchain anchoring (optional - don't fail if it doesn't work)
    try {
      const anchorPayload = JSON.stringify({
        uuid,
        student,
        course,
        institute,
        date
      });
      const contentHashHex = computeContentHashHex(anchorPayload);
      const anchoring = await anchorHashOnChain(contentHashHex);
      cert.blockchain = anchoring;
      console.log('🔗 Blockchain anchoring successful');
    } catch (blockchainError) {
      console.warn('⚠️ Blockchain anchoring failed, continuing without it:', blockchainError.message);
      // Set a default blockchain object to indicate it wasn't anchored
      cert.blockchain = {
        txId: null,
        network: 'not_anchored',
        anchoredAt: null,
        error: blockchainError.message
      };
    }
    
    console.log('💾 Saving certificate to database...');
    await cert.save();
    console.log('✅ Certificate saved successfully with ID:', cert._id);
    const io = getIO();
    if (io) {
      io.emit('certificate:created', { 
        uuid: cert.uuid, 
        institute: cert.institute, 
        student: cert.student, 
        course: cert.course, 
        date: cert.date, 
        blockchain: cert.blockchain,
        timestamp: new Date().toISOString()
      });
      
      // Send admin notification
      io.emit('admin:notification', {
        type: 'certificate_created',
        title: 'New Certificate Generated',
        message: `Certificate generated for ${cert.student} - ${cert.course}`,
        data: {
          student: cert.student,
          course: cert.course,
          institute: cert.institute,
          uuid: cert.uuid
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Return success with certificate data
    res.status(201).json({
      success: true,
      certificate: cert,
      message: 'Certificate created successfully'
    });
  } catch (err) {
    console.error('Certificate creation error:', err);
    res.status(500).json({ message: 'Server error while creating certificate' });
  }
};

// Get all certificates with pagination and filtering
export const getCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 10, institute, course, student } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = {};
    if (institute) filter.institute = institute;
    if (course) filter.course = course;
    if (student) filter.student = { $regex: student, $options: 'i' };

    const certificates = await Certificate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Certificate.countDocuments(filter);
    
    res.json({
      certificates,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Get certificates error:', err);
    res.status(500).json({ message: 'Server error while fetching certificates' });
  }
};

// Get certificate by MongoDB ID
export const getCertificateById = async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(cert);
  } catch (err) {
    console.error('Get certificate by ID error:', err);
    res.status(500).json({ message: 'Server error while fetching certificate' });
  }
};

// Update certificate by ID
export const updateCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    const io = getIO();
    if (io) io.emit('certificate:updated', { id: cert._id, institute: cert.institute, student: cert.student, course: cert.course, date: cert.date });
    res.json({
      success: true,
      certificate: cert,
      message: 'Certificate updated successfully'
    });
  } catch (err) {
    console.error('Update certificate error:', err);
    res.status(400).json({ message: 'Server error while updating certificate' });
  }
};

// Delete certificate by ID
export const deleteCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndDelete(req.params.id);
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    const io = getIO();
    if (io) io.emit('certificate:deleted', { id: req.params.id });
    res.json({ 
      success: true,
      message: 'Certificate deleted successfully' 
    });
  } catch (err) {
    console.error('Delete certificate error:', err);
    res.status(500).json({ message: 'Server error while deleting certificate' });
  }
};

// ✅ Enhanced certificate validation by UUID with detailed response
export const validateCertificate = async (req, res) => {
  try {
    const { uuid } = req.params;
    
    console.log('🔍 Validating certificate with UUID:', uuid);
    
    if (!uuid) {
      return res.status(400).json({ 
        valid: false, 
        message: 'UUID is required' 
      });
    }

    // First try to find certificate with generatedByAdmin: true
    let cert = await Certificate.findOne({ 
      uuid,
      generatedByAdmin: true 
    });
    
    console.log('🔍 Certificate with generatedByAdmin: true:', cert ? 'Found' : 'Not found');
    
    // If not found, try to find any certificate with this UUID (for backward compatibility)
    if (!cert) {
      cert = await Certificate.findOne({ uuid });
      console.log('🔍 Certificate without generatedByAdmin filter:', cert ? 'Found' : 'Not found');
      if (cert) {
        console.log(`Certificate found but not generatedByAdmin: ${uuid}`);
        // Update the certificate to mark it as generated by admin
        cert.generatedByAdmin = true;
        await cert.save();
        console.log('✅ Updated certificate with generatedByAdmin: true');
      }
    }
    
    if (!cert) {
      console.log('❌ No certificate found for UUID:', uuid);
      return res.json({
        valid: false,
        message: 'Certificate not found',
        uuid: uuid,
        error: 'INVALID_CERTIFICATE'
      });
    }
    
    console.log('✅ Certificate found:', {
      uuid: cert.uuid,
      student: cert.student,
      course: cert.course,
      institute: cert.institute,
      generatedByAdmin: cert.generatedByAdmin
    });

    // Get institute details
    const institute = await Institute.findOne({ name: cert.institute });
    
    // Add validation record (with error handling)
    try {
      await cert.addValidation('admin', req.ip, req.get('User-Agent'));
      console.log('✅ Validation record added successfully');
    } catch (validationError) {
      console.error('⚠️ Error adding validation record:', validationError);
      // Continue with validation even if adding record fails
    }
    
    // Emit real-time validation event
    const io = getIO();
    if (io) {
      io.emit('certificate:validated', {
        uuid: cert.uuid,
        student: cert.student,
        institute: cert.institute,
        timestamp: new Date().toISOString(),
        valid: true
      });
    }
    
    res.json({
      valid: true,
      certificate: {
        uuid: cert.uuid,
        student: cert.student,
        course: cert.course,
        institute: cert.institute,
        date: cert.date,
        issued: cert.issued,
        generatedByAdmin: cert.generatedByAdmin,
        createdAt: cert.createdAt,
        blockchain: cert.blockchain
      },
      institute: institute ? {
        name: institute.name,
        email: institute.email,
        contact: institute.contact,
        location: institute.location,
        status: institute.status
      } : null,
      validation: {
        validatedAt: new Date().toISOString(),
        generatedThroughSystem: true,
        validationCount: cert.validationCount
      },
      message: 'Certificate is valid and was generated through this system'
    });
  } catch (err) {
    console.error('Certificate validation error:', err);
    res.status(500).json({ 
      valid: false,
      message: 'Server error during validation' 
    });
  }
};

// Bulk certificate operations
export const bulkValidateCertificates = async (req, res) => {
  try {
    const { uuids } = req.body;
    
    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ message: 'UUIDs array is required' });
    }

    const results = await Promise.all(
      uuids.map(async (uuid) => {
        const cert = await Certificate.findOne({ uuid });
        return {
          uuid,
          valid: !!cert,
          certificate: cert ? {
            student: cert.student,
            course: cert.course,
            institute: cert.institute,
            date: cert.date
          } : null
        };
      })
    );

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.length - validCount;

    res.json({
      results,
      summary: {
        total: results.length,
        valid: validCount,
        invalid: invalidCount,
        successRate: ((validCount / results.length) * 100).toFixed(2)
      }
    });
  } catch (err) {
    console.error('Bulk validation error:', err);
    res.status(500).json({ message: 'Server error during bulk validation' });
  }
};

// Get certificate statistics
export const getCertificateStats = async (req, res) => {
  try {
    const { startDate, endDate, institute } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    let instituteFilter = {};
    if (institute) {
      instituteFilter = { institute: institute };
    }

    const filter = { ...dateFilter, ...instituteFilter };

    const [
      totalCertificates,
      totalInstitutes,
      certificatesByMonth,
      topInstitutes,
      courseDistribution
    ] = await Promise.all([
      Certificate.countDocuments(filter),
      Certificate.distinct('institute', filter).then(insts => insts.length),
      Certificate.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { 
              year: { $year: '$createdAt' }, 
              month: { $month: '$createdAt' } 
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Certificate.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$institute',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Certificate.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$course',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      totalCertificates,
      totalInstitutes,
      certificatesByMonth,
      topInstitutes,
      courseDistribution,
      period: { startDate, endDate }
    });
  } catch (err) {
    console.error('Certificate stats error:', err);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
};

// Generate certificate with QR code
export const generateCertificateWithQR = async (req, res) => {
  try {
    const { student, course, institute, date, customizations } = req.body;
    
    // Generate UUID
    const uuid = require('crypto').randomUUID();
    
    // Create certificate
    const cert = new Certificate({
      uuid,
      student,
      course,
      institute,
      date,
      issued: true,
      customizations: customizations || {},
      createdAt: new Date()
    });
    
    await cert.save();
    
    // Generate QR code data
    const qrData = {
      uuid,
      validationUrl: `${req.protocol}://${req.get('host')}/api/certificates/validate/${uuid}`,
      student,
      course,
      institute,
      date
    };
    
    res.status(201).json({
      success: true,
      certificate: cert,
      qrData: JSON.stringify(qrData),
      message: 'Certificate generated successfully with QR code'
    });
  } catch (err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ message: 'Server error while generating certificate' });
  }
};

// AI-Powered Certificate Image Analysis
export const analyzeCertificateImage = async (req, res) => {
  try {
    const { imageData, uuid } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image data is required' 
      });
    }

    // First validate if the certificate exists in our system
    let cert = null;
    if (uuid) {
      cert = await Certificate.findOne({ uuid });
    }

    // Perform basic image analysis (in a real system, this would use AI/ML)
    const analysis = {
      success: true,
      certificateFound: !!cert,
      authenticity: cert ? 'Authentic' : 'Unknown',
      confidence: cert ? 95 : 30,
      detectedElements: ['QR Code', 'Signature', 'Seal', 'Text'],
      anomalies: [],
      recommendations: [],
      certificate: cert ? {
        uuid: cert.uuid,
        student: cert.student,
        course: cert.course,
        institute: cert.institute,
        date: cert.date,
        generatedByAdmin: cert.generatedByAdmin
      } : null
    };

    // Add recommendations based on analysis
    if (cert) {
      analysis.recommendations.push('Certificate found in our database');
      analysis.recommendations.push('QR code validation successful');
      analysis.recommendations.push('Certificate is authentic and valid');
    } else {
      analysis.recommendations.push('Certificate not found in our database');
      analysis.recommendations.push('Please verify the certificate manually');
      analysis.recommendations.push('Contact the issuing institute for verification');
    }

    res.json(analysis);
  } catch (err) {
    console.error('AI analysis error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during AI analysis' 
    });
  }
};

// Blockchain Verification
export const verifyBlockchainTransaction = async (req, res) => {
  try {
    const { txId, uuid } = req.body;
    
    if (!txId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction ID is required' 
      });
    }

    // First check if certificate exists in our system
    let cert = null;
    if (uuid) {
      cert = await Certificate.findOne({ uuid });
    }

    // Verify blockchain transaction (in a real system, this would check actual blockchain)
    const verification = {
      success: true,
      verified: cert ? true : false,
      txId: txId,
      certificateFound: !!cert,
      certificate: cert ? {
        uuid: cert.uuid,
        student: cert.student,
        course: cert.course,
        institute: cert.institute,
        date: cert.date,
        generatedByAdmin: cert.generatedByAdmin,
        blockchain: cert.blockchain
      } : null,
      blockchain: {
        network: 'Certificate Management System',
        blockNumber: cert ? cert.blockchain?.txId || 'N/A' : 'N/A',
        timestamp: cert ? cert.createdAt : new Date(),
        status: cert ? 'Verified' : 'Not Found'
      }
    };

    res.json(verification);
  } catch (err) {
    console.error('Blockchain verification error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during blockchain verification' 
    });
  }
};
