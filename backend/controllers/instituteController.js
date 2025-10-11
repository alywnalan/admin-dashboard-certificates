import Institute from '../models/Institute.js';
import Certificate from '../models/Certificate.js';
import { getIO } from '../realtime.js';

// Create institute with enhanced validation and revenue tracking
export const createInstitute = async (req, res) => {
  try {
    const { name, email, contact, location, password, type, revenue, courses } = req.body;
    
    // Validate required fields
    if (!name || !email || !contact || !location || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, email, contact, location, password' 
      });
    }

    // Check if institute with this email already exists
    const existingInstitute = await Institute.findOne({ email });
    if (existingInstitute) {
      return res.status(400).json({ message: 'Institute with this email already exists' });
    }

    const inst = new Institute({
      name,
      email,
      contact,
      location,
      password,
      type: type || 'college',
      revenue: revenue || 0,
      courses: courses || [],
      createdAt: new Date(),
      status: 'active'
    });
    
    await inst.save();
    const io = getIO();
    if (io) io.emit('institute:created', { id: inst._id, name: inst.name, location: inst.location });
    
    res.status(201).json({
      success: true,
      institute: inst,
      message: 'Institute created successfully'
    });
  } catch (err) {
    console.error('Institute creation error:', err);
    res.status(500).json({ message: 'Server error while creating institute' });
  }
};

// Get all institutes with filtering and pagination
export const getInstitutes = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, location, status } = req.query;
    const skip = (page - 1) * limit;
    
    let filter = {};
    if (type) filter.type = type;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (status) filter.status = status;

    const institutes = await Institute.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Institute.countDocuments(filter);
    
    res.json({
      institutes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Get institutes error:', err);
    res.status(500).json({ message: 'Server error while fetching institutes' });
  }
};

// Get institute by ID with detailed statistics
export const getInstituteById = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id).select('-password');
    if (!inst) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    // Get certificate statistics for this institute
    const certificateStats = await Certificate.aggregate([
      { $match: { institute: inst.name } },
      {
        $group: {
          _id: null,
          totalCertificates: { $sum: 1 },
          uniqueStudents: { $addToSet: '$student' },
          uniqueCourses: { $addToSet: '$course' },
          lastCertificate: { $max: '$createdAt' }
        }
      }
    ]);

    const stats = certificateStats[0] || {
      totalCertificates: 0,
      uniqueStudents: [],
      uniqueCourses: [],
      lastCertificate: null
    };

    res.json({
      institute: inst,
      statistics: {
        totalCertificates: stats.totalCertificates,
        uniqueStudents: stats.uniqueStudents.length,
        uniqueCourses: stats.uniqueCourses.length,
        lastCertificate: stats.lastCertificate
      }
    });
  } catch (err) {
    console.error('Get institute by ID error:', err);
    res.status(500).json({ message: 'Server error while fetching institute' });
  }
};

// Update institute with enhanced validation
export const updateInstitute = async (req, res) => {
  try {
    const { name, email, contact, location, type, revenue, courses, status } = req.body;
    
    // Check if email is being changed and if it already exists
    if (email) {
      const existingInstitute = await Institute.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingInstitute) {
        return res.status(400).json({ message: 'Email already in use by another institute' });
      }
    }

    const inst = await Institute.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!inst) {
      return res.status(404).json({ message: 'Institute not found' });
    }
    
    const io = getIO();
    if (io) io.emit('institute:updated', { id: inst._id, name: inst.name, location: inst.location });
    res.json({
      success: true,
      institute: inst,
      message: 'Institute updated successfully'
    });
  } catch (err) {
    console.error('Update institute error:', err);
    res.status(400).json({ message: 'Server error while updating institute' });
  }
};

// Delete institute with cascade check
export const deleteInstitute = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    // Check if institute has certificates
    const certificateCount = await Certificate.countDocuments({ institute: inst.name });
    if (certificateCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete institute. It has ${certificateCount} associated certificates.` 
      });
    }

    await Institute.findByIdAndDelete(req.params.id);
    const io = getIO();
    if (io) io.emit('institute:deleted', { id: req.params.id });
    
    res.json({ 
      success: true,
      message: 'Institute deleted successfully' 
    });
  } catch (err) {
    console.error('Delete institute error:', err);
    res.status(500).json({ message: 'Server error while deleting institute' });
  }
};

// Get institute performance analytics
export const getInstitutePerformance = async (req, res) => {
  try {
    const { startDate, endDate, instituteId } = req.query;
    
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
    if (instituteId) {
      const institute = await Institute.findById(instituteId);
      if (institute) {
        instituteFilter = { institute: institute.name };
      }
    }

    const filter = { ...dateFilter, ...instituteFilter };

    const performance = await Certificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$institute',
          totalCertificates: { $sum: 1 },
          uniqueStudents: { $addToSet: '$student' },
          uniqueCourses: { $addToSet: '$course' },
          monthlyData: {
            $push: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
              count: 1
            }
          }
        }
      },
      {
        $addFields: {
          studentCount: { $size: '$uniqueStudents' },
          courseCount: { $size: '$uniqueCourses' },
          performanceScore: {
            $multiply: [
              { $size: '$uniqueStudents' },
              { $size: '$uniqueCourses' },
              { $toInt: '$totalCertificates' }
            ]
          }
        }
      },
      { $sort: { performanceScore: -1 } }
    ]);

    res.json({ performance });
  } catch (err) {
    console.error('Institute performance error:', err);
    res.status(500).json({ message: 'Server error while fetching performance data' });
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get revenue by institute
    const revenueByInstitute = await Institute.aggregate([
      {
        $lookup: {
          from: 'certificates',
          localField: 'name',
          foreignField: 'institute',
          as: 'certificates'
        }
      },
      {
        $addFields: {
          certificateCount: { $size: '$certificates' },
          estimatedRevenue: { $multiply: ['$revenue', { $size: '$certificates' }] }
        }
      },
      {
        $group: {
          _id: '$name',
          totalRevenue: { $sum: '$estimatedRevenue' },
          certificateCount: { $sum: '$certificateCount' },
          baseRevenue: { $sum: '$revenue' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Get monthly revenue trends
    const monthlyRevenue = await Certificate.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' }, 
            month: { $month: '$createdAt' } 
          },
          certificateCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          estimatedRevenue: { $multiply: ['$certificateCount', 25] } // $25 per certificate
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      revenueByInstitute,
      monthlyRevenue,
      totalRevenue: revenueByInstitute.reduce((sum, inst) => sum + inst.totalRevenue, 0)
    });
  } catch (err) {
    console.error('Revenue analytics error:', err);
    res.status(500).json({ message: 'Server error while fetching revenue data' });
  }
};

// Get institute types and categories
export const getInstituteTypes = async (req, res) => {
  try {
    const types = await Institute.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const locations = await Institute.aggregate([
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ types, locations });
  } catch (err) {
    console.error('Institute types error:', err);
    res.status(500).json({ message: 'Server error while fetching institute types' });
  }
};
