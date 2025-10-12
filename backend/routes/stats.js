import express from 'express';
import auth from '../middleware/auth.js';
import Certificate from '../models/Certificate.js';
import Institute from '../models/Institute.js';

const router = express.Router();

// Basic counts
router.get('/counts', auth, async (req, res) => {
  try {
    const [totalCertificates, totalInstitutes] = await Promise.all([
      Certificate.countDocuments({}),
      Institute.countDocuments({})
    ]);
    res.json({ totalCertificates, totalInstitutes });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Advanced analytics with date filtering
router.get('/analytics', auth, async (req, res) => {
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

    // Get counts for current period
    const currentCounts = await Certificate.countDocuments(filter);
    
    // Get counts for previous period (for comparison)
    const previousStartDate = startDate ? new Date(startDate) : new Date();
    const previousEndDate = endDate ? new Date(endDate) : new Date();
    const periodLength = previousEndDate - previousStartDate;
    
    const previousStart = new Date(previousStartDate.getTime() - periodLength);
    const previousEnd = new Date(previousStartDate.getTime());
    
    const previousCounts = await Certificate.countDocuments({
      createdAt: { $gte: previousStart, $lte: previousEnd },
      ...instituteFilter
    });

    // Calculate growth rate
    const growthRate = previousCounts > 0 ? 
      ((currentCounts - previousCounts) / previousCounts * 100).toFixed(1) : 0;

    // Get top performing institutes
    const topInstitutes = await Certificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$institute',
          count: { $sum: 1 },
          courses: { $addToSet: '$course' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get course distribution
    const courseDistribution = await Certificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get daily trends
    const dailyTrends = await Certificate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' }, 
            month: { $month: '$createdAt' }, 
            day: { $dayOfMonth: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      currentPeriod: {
        totalCertificates: currentCounts,
        growthRate: parseFloat(growthRate),
        period: { startDate, endDate }
      },
      previousPeriod: {
        totalCertificates: previousCounts,
        period: { startDate: previousStart, endDate: previousEnd }
      },
      topInstitutes,
      courseDistribution,
      dailyTrends
    });

  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Institute performance analytics
router.get('/institutes/performance', auth, async (req, res) => {
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

    const institutePerformance = await Certificate.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$institute',
          totalCertificates: { $sum: 1 },
          uniqueCourses: { $addToSet: '$course' },
          uniqueStudents: { $addToSet: '$student' },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          courseCount: { $size: '$uniqueCourses' },
          studentCount: { $size: '$uniqueStudents' },
          performanceScore: {
            $multiply: [
              { $size: '$uniqueCourses' },
              { $size: '$uniqueStudents' },
              { $toInt: '$totalCertificates' }
            ]
          }
        }
      },
      { $sort: { performanceScore: -1 } }
    ]);

    res.json({ institutePerformance });

  } catch (err) {
    console.error('Institute performance error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Geographic analytics
router.get('/geographic', auth, async (req, res) => {
  try {
    const geoData = await Institute.aggregate([
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
          location: { $ifNull: ['$address', 'Unknown'] }
        }
      },
      {
        $group: {
          _id: '$location',
          instituteCount: { $sum: 1 },
          totalCertificates: { $sum: '$certificateCount' }
        }
      },
      { $sort: { totalCertificates: -1 } }
    ]);

    res.json({ geoData });

  } catch (err) {
    console.error('Geographic analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// AI-powered insights
router.get('/insights', auth, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get monthly comparison
    const [lastMonthCount, thisMonthCount] = await Promise.all([
      Certificate.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      Certificate.countDocuments({ createdAt: { $gte: thisMonth } })
    ]);

    // Calculate trends
    const monthOverMonthGrowth = lastMonthCount > 0 ? 
      ((thisMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1) : 0;

    // Get low performing institutes
    const lowPerformingInstitutes = await Certificate.aggregate([
      {
        $group: {
          _id: '$institute',
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $lt: 5 } } },
      { $sort: { count: 1 } }
    ]);

    // Get course recommendations
    const courseTrends = await Certificate.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
          recentCount: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', lastMonth] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          growth: {
            $cond: [
              { $gt: [{ $subtract: ['$count', '$recentCount'] }, 0] },
              { $divide: ['$recentCount', { $subtract: ['$count', '$recentCount'] }] },
              0
            ]
          }
        }
      },
      { $sort: { growth: -1 } },
      { $limit: 5 }
    ]);

    const insights = {
      trends: {
        monthOverMonthGrowth: parseFloat(monthOverMonthGrowth),
        currentMonthCount: thisMonthCount,
        lastMonthCount: lastMonthCount
      },
      alerts: {
        lowPerformingInstitutes: lowPerformingInstitutes.length,
        institutes: lowPerformingInstitutes.map(inst => inst._id)
      },
      recommendations: {
        trendingCourses: courseTrends.filter(course => course.growth > 0.5),
        suggestedExpansion: courseTrends.slice(0, 3).map(course => course._id)
      }
    };

    res.json({ insights });

  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Certificates per month for last 12 months
router.get('/certificates/monthly', auth, async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const data = await Certificate.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;



