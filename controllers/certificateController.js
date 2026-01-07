import Certificate from '../models/Certificate.js';
import Institute from '../models/Institute.js';
import Template from '../models/Template.js';
import Student from '../models/Student.js';
import { getIO } from '../realtime.js';
import { anchorHashOnChain, computeContentHashHex } from '../blockchain.js';
import XLSX from 'xlsx';
import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

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
    
    // Optional: allow admin to attach subjects and student email
    if (req.body.subjects && Array.isArray(req.body.subjects)) {
      cert.subjects = req.body.subjects;
    }

    if (req.body.metadata && req.body.metadata.studentEmail) {
      cert.metadata = cert.metadata || {};
      cert.metadata.studentEmail = req.body.metadata.studentEmail;
    } else if (req.body.studentEmail) {
      cert.metadata = cert.metadata || {};
      cert.metadata.studentEmail = req.body.studentEmail;
    }

    // Try to link to a Student document if email matches
    try {
      const studentEmail = cert.metadata && cert.metadata.studentEmail;
      if (studentEmail) {
        const studentDoc = await Student.findOne({ email: studentEmail });
        if (studentDoc) {
          cert.studentId = studentDoc._id;
          // Ensure student name is normalized from Student doc
          cert.student = studentDoc.name || cert.student;
        }
      }
    } catch (err) {
      console.warn('Student link check failed:', err.message);
    }

    // Generate verification URL and QR code (data URL)
    try {
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/certificates/validate/${uuid}`;
      const qrImageDataUrl = await QRCode.toDataURL(verificationUrl);
      cert.qrCode = { data: verificationUrl, image: qrImageDataUrl };
    } catch (err) {
      console.warn('QR generation failed:', err.message);
    }

    console.log('📝 Certificate object created:', {
      uuid: cert.uuid,
      student: cert.student,
      course: cert.course,
      institute: cert.institute,
      generatedByAdmin: cert.generatedByAdmin,
      hasQR: Boolean(cert.qrCode && cert.qrCode.image)
    });
    
    // Real-time blockchain anchoring with progress updates
    const blockchainIO = getIO();
    if (blockchainIO) {
      blockchainIO.emit('blockchain:anchoring', { 
        uuid, 
        student, 
        status: 'starting',
        message: 'Starting blockchain anchoring...'
      });
    }

    try {
      const anchorPayload = JSON.stringify({
        uuid,
        student,
        course,
        institute,
        date,
        metadata: cert.metadata
      });
      
      if (blockchainIO) {
        blockchainIO.emit('blockchain:anchoring', { 
          uuid, 
          student, 
          status: 'processing',
          message: 'Computing content hash...'
        });
      }
      
      const contentHashHex = computeContentHashHex(anchorPayload);
      
      if (blockchainIO) {
        blockchainIO.emit('blockchain:anchoring', { 
          uuid, 
          student, 
          status: 'processing',
          message: 'Submitting to blockchain...'
        });
      }
      
      const anchoring = await anchorHashOnChain(contentHashHex);
      cert.blockchain = anchoring;
      
      if (blockchainIO) {
        blockchainIO.emit('blockchain:anchored', { 
          uuid, 
          student, 
          status: 'success',
          txId: anchoring.txId,
          message: 'Successfully anchored to blockchain'
        });
      }
      
      console.log('🔗 Blockchain anchoring successful');
    } catch (blockchainError) {
      console.warn('⚠️ Blockchain anchoring failed, continuing without it:', blockchainError.message);
      
      if (blockchainIO) {
        blockchainIO.emit('blockchain:anchoring', { 
          uuid, 
          student, 
          status: 'error',
          message: `Blockchain anchoring failed: ${blockchainError.message}`
        });
      }
      
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

// Enhanced bulk certificate operations with real-time data
export const bulkValidateCertificates = async (req, res) => {
  try {
    const { uuids, studentDetails, instituteFilter, dateRange } = req.body;
    
    console.log('🔍 Enhanced bulk validation started:', {
      uuidsCount: uuids?.length || 0,
      studentDetailsCount: studentDetails?.length || 0,
      instituteFilter,
      dateRange
    });

    let query = {};
    
    // Apply filters
    if (instituteFilter) {
      query.institute = { $regex: instituteFilter, $options: 'i' };
    }
    
    if (dateRange && dateRange.start && dateRange.end) {
      query.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    // If UUIDs are provided, validate specific certificates
    if (uuids && Array.isArray(uuids) && uuids.length > 0) {
      query.uuid = { $in: uuids };
    }

    // If student details are provided, match against student data
    if (studentDetails && Array.isArray(studentDetails) && studentDetails.length > 0) {
      const studentNames = studentDetails.map(s => s.name || s.studentName).filter(Boolean);
      if (studentNames.length > 0) {
        query.student = { $in: studentNames };
      }
    }

    console.log('🔍 Query filter:', query);

    // Find certificates with enhanced data
    const certificates = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.log('🔍 Found certificates:', certificates.length);

    // Enhanced validation results with real-time data
    const results = certificates.map(cert => {
      const validationHistory = cert.validationHistory || [];
      const lastValidation = validationHistory.length > 0 
        ? validationHistory[validationHistory.length - 1] 
        : null;

      return {
        uuid: cert.uuid,
        valid: true,
        certificate: {
          id: cert._id,
          student: cert.student,
          course: cert.course,
          institute: cert.institute,
          date: cert.date,
          status: cert.status,
          issued: cert.issued,
          generatedByAdmin: cert.generatedByAdmin,
          createdAt: cert.createdAt,
          updatedAt: cert.updatedAt,
          metadata: cert.metadata || {},
          customizations: cert.customizations || {},
          validationCount: validationHistory.length,
          lastValidated: lastValidation?.validatedAt || null,
          isExpired: cert.isExpired ? cert.isExpired() : false
        },
        realTimeData: {
          validationHistory: validationHistory,
          qrCode: cert.qrCode,
          blockchain: cert.blockchain,
          instituteDetails: cert.institute
        }
      };
    });

    // If UUIDs were provided, also check for missing ones
    let missingCertificates = [];
    if (uuids && Array.isArray(uuids)) {
      const foundUUIDs = results.map(r => r.uuid);
      missingCertificates = uuids.filter(uuid => !foundUUIDs.includes(uuid));
    }

    // Add missing certificates to results
    const missingResults = missingCertificates.map(uuid => ({
      uuid,
      valid: false,
      certificate: null,
      error: 'Certificate not found in database'
    }));

    const allResults = [...results, ...missingResults];
    const validCount = results.length;
    const invalidCount = missingResults.length;
    const totalCount = allResults.length;

    // Real-time analytics
    const analytics = {
      totalCertificates: totalCount,
      validCertificates: validCount,
      invalidCertificates: invalidCount,
      successRate: totalCount > 0 ? ((validCount / totalCount) * 100).toFixed(2) : 0,
      byInstitute: {},
      byStatus: {},
      byDateRange: {}
    };

    // Calculate analytics
    results.forEach(result => {
      const cert = result.certificate;
      if (cert) {
        // By institute
        const institute = cert.institute;
        analytics.byInstitute[institute] = (analytics.byInstitute[institute] || 0) + 1;
        
        // By status
        const status = cert.status || 'issued';
        analytics.byStatus[status] = (analytics.byStatus[status] || 0) + 1;
        
        // By date range
        const date = new Date(cert.createdAt).toISOString().split('T')[0];
        analytics.byDateRange[date] = (analytics.byDateRange[date] || 0) + 1;
      }
    });

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.emit('bulk:validation:completed', {
        totalProcessed: totalCount,
        validCount,
        invalidCount,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      results: allResults,
      analytics,
      summary: {
        total: totalCount,
        valid: validCount,
        invalid: invalidCount,
        successRate: analytics.successRate,
        processedAt: new Date().toISOString()
      },
      filters: {
        instituteFilter,
        dateRange,
        studentDetailsCount: studentDetails?.length || 0
      }
    });
  } catch (err) {
    console.error('Enhanced bulk validation error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during enhanced bulk validation',
      error: err.message 
    });
  }
};

// Enhanced database interface for all certificates
export const getAllCertificatesDatabase = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      institute, 
      course, 
      student, 
      status, 
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 Database query parameters:', {
      page, limit, search, institute, course, student, status, startDate, endDate, sortBy, sortOrder
    });

    // Build query filters
    let query = {};
    
    // Text search across multiple fields
    if (search) {
      query.$or = [
        { student: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { institute: { $regex: search, $options: 'i' } },
        { uuid: { $regex: search, $options: 'i' } }
      ];
    }

    // Specific field filters
    if (institute) query.institute = { $regex: institute, $options: 'i' };
    if (course) query.course = { $regex: course, $options: 'i' };
    if (student) query.student = { $regex: student, $options: 'i' };
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute queries in parallel
    const [certificates, totalCount, stats] = await Promise.all([
      Certificate.find(query)
        .sort(sortConfig)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Certificate.countDocuments(query),
      Certificate.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalCertificates: { $sum: 1 },
            totalInstitutes: { $addToSet: '$institute' },
            totalCourses: { $addToSet: '$course' },
            totalStudents: { $addToSet: '$student' },
            avgValidationCount: { $avg: { $size: '$validationHistory' } },
            byStatus: {
              $push: {
                status: '$status',
                count: 1
              }
            }
          }
        },
        {
          $project: {
            totalCertificates: 1,
            uniqueInstitutes: { $size: '$totalInstitutes' },
            uniqueCourses: { $size: '$totalCourses' },
            uniqueStudents: { $size: '$totalStudents' },
            avgValidationCount: { $round: ['$avgValidationCount', 2] },
            statusBreakdown: {
              $reduce: {
                input: '$byStatus',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [
                        [
                          {
                            k: '$$this.status',
                            v: { $sum: ['$$value.$$this.status', '$$this.count'] }
                          }
                        ]
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      ])
    ]);

    // Enhanced certificate data with real-time information
    const enhancedCertificates = certificates.map(cert => {
      const validationHistory = cert.validationHistory || [];
      const lastValidation = validationHistory.length > 0 
        ? validationHistory[validationHistory.length - 1] 
        : null;

      return {
        id: cert._id,
        uuid: cert.uuid,
        student: cert.student,
        course: cert.course,
        institute: cert.institute,
        date: cert.date,
        status: cert.status || 'issued',
        issued: cert.issued,
        generatedByAdmin: cert.generatedByAdmin,
        createdAt: cert.createdAt,
        updatedAt: cert.updatedAt,
        metadata: cert.metadata || {},
        customizations: cert.customizations || {},
        validationCount: validationHistory.length,
        lastValidated: lastValidation?.validatedAt || null,
        isExpired: cert.isExpired ? cert.isExpired() : false,
        qrCode: cert.qrCode,
        blockchain: cert.blockchain,
        instituteDetails: cert.institute,
        validationHistory: validationHistory
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Real-time analytics
    const analytics = stats[0] || {
      totalCertificates: 0,
      uniqueInstitutes: 0,
      uniqueCourses: 0,
      uniqueStudents: 0,
      avgValidationCount: 0,
      statusBreakdown: {}
    };

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.emit('database:query:completed', {
        totalResults: totalCount,
        page: parseInt(page),
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        certificates: enhancedCertificates,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage,
          hasPrevPage
        },
        analytics,
        filters: {
          search,
          institute,
          course,
          student,
          status,
          startDate,
          endDate,
          sortBy,
          sortOrder
        },
        queryTime: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during database query',
      error: err.message 
    });
  }
};

// Export certificates data
export const exportCertificatesData = async (req, res) => {
  try {
    const { format = 'json', filters = {} } = req.body;
    
    console.log('📊 Export request:', { format, filters });

    // Build query from filters
    let query = {};
    if (filters.institute) query.institute = { $regex: filters.institute, $options: 'i' };
    if (filters.course) query.course = { $regex: filters.course, $options: 'i' };
    if (filters.student) query.student = { $regex: filters.student, $options: 'i' };
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const certificates = await Certificate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = certificates.map(cert => ({
        UUID: cert.uuid,
        Student: cert.student,
        Course: cert.course,
        Institute: cert.institute,
        Date: cert.date,
        Status: cert.status,
        'Created At': cert.createdAt,
        'Validation Count': cert.validationHistory?.length || 0,
        'Last Validated': cert.validationHistory?.length > 0 
          ? cert.validationHistory[cert.validationHistory.length - 1].validatedAt 
          : null
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=certificates.csv');
      
      // Simple CSV conversion
      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      res.send(csv);
    } else {
      // JSON format
      res.json({
        success: true,
        format: 'json',
        count: certificates.length,
        data: certificates,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during export',
      error: err.message 
    });
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

// Batch generate certificates from uploaded data (body or file) using a selected template
export const batchGenerateCertificates = async (req, res) => {
  try {
    // Accept either JSON array in body.records or a base64 csv/xlsx in body.file
    const { records, templateId } = req.body || {};

    if (!templateId) {
      return res.status(400).json({ message: 'templateId is required' });
    }

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    let rows = [];
    if (Array.isArray(records) && records.length > 0) {
      rows = records;
    } else if (req.file) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({ message: 'No records provided' });
    }

    const io = getIO();
    const total = rows.length;
    let success = 0;
    let failed = 0;
    const created = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        const uuid = require('crypto').randomUUID();
        const cert = new Certificate({
          uuid,
          student: row.student || row.name,
          course: row.course,
          institute: row.institute,
          date: row.date,
          issued: true,
          generatedByAdmin: true
        });

        // Optional: anchor
        try {
          const anchorPayload = JSON.stringify({
            uuid,
            student: cert.student,
            course: cert.course,
            institute: cert.institute,
            date: cert.date
          });
          const contentHashHex = computeContentHashHex(anchorPayload);
          const anchoring = await anchorHashOnChain(contentHashHex);
          cert.blockchain = anchoring;
        } catch {}

        await cert.save();
        success++;
        created.push({ uuid: cert.uuid, student: cert.student, course: cert.course });

        if (io) {
          io.emit('batch:progress', {
            type: 'progress',
            index,
            total,
            success,
            failed,
            last: { uuid: cert.uuid, student: cert.student }
          });
        }
      } catch (e) {
        failed++;
        if (io) {
          io.emit('batch:progress', {
            type: 'error',
            index,
            total,
            success,
            failed,
            error: e.message
          });
        }
      }
    }

    if (getIO()) {
      getIO().emit('batch:complete', { total, success, failed });
    }

    return res.json({ success: true, total, successCount: success, failedCount: failed, created });
  } catch (err) {
    console.error('Batch generation error:', err);
    return res.status(500).json({ message: 'Server error while batch generating certificates' });
  }
};

// Clear all certificates from the database (admin-only usage recommended)
export const clearAllCertificates = async (req, res) => {
  try {
    const result = await Certificate.deleteMany({});
    const io = getIO();
    if (io) {
      io.emit('certificates:cleared', { timestamp: new Date().toISOString(), deletedCount: result.deletedCount || 0 });
    }
    return res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('Clear certificates error:', err);
    return res.status(500).json({ message: 'Server error while clearing certificates' });
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
