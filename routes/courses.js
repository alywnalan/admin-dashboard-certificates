import express from 'express';
import Course from '../models/Course.js';
import studentAuth from '../middleware/studentAuth.js';
import adminAuth from '../middleware/auth.js';
import { getIO } from '../realtime.js';

const router = express.Router();

// Admin: List all enrollments (recent first)
router.get('/', adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const courses = await Course.find({}).sort({ createdAt: -1 }).limit(limit);
    res.json({ courses });
  } catch (err) {
    console.error('Get all courses error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: Get their courses
router.get('/my-courses', studentAuth, async (req, res) => {
  try {
    const courses = await Course.find({ studentId: req.student.id }).sort({ createdAt: -1 });
    res.json({ courses });
  } catch (err) {
    console.error('Get student courses error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: Enroll in a course
router.post('/enroll', studentAuth, async (req, res) => {
  try {
    const { courseName, courseCode, institute, description, startDate } = req.body;
    if (!courseName) return res.status(400).json({ message: 'Course name required.' });

    const course = new Course({
      studentId: req.student.id,
      studentEmail: req.student.email,
      courseName,
      courseCode,
      institute,
      description,
      startDate,
      status: 'pending'
    });

    await course.save();
    
    // Real-time notification to admin
    const io = getIO();
    if (io) {
      io.emit('student:enrolled', {
        studentId: req.student.id,
        studentName: req.student.name,
        studentEmail: req.student.email,
        course: { id: course._id, name: courseName, code: courseCode },
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, course, message: 'Enrolled successfully.' });
  } catch (err) {
    console.error('Enroll course error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: Update course (mark as completed, etc.)
router.patch('/my-courses/:courseId', studentAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.studentId.toString() !== req.student.id) return res.status(403).json({ message: 'Access denied' });

    Object.assign(course, req.body);
    await course.save();

    // Real-time update to admin
    const io = getIO();
    if (io) {
      io.emit('student:courseUpdated', {
        studentId: req.student.id,
        studentEmail: req.student.email,
        course: course,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, course, message: 'Course updated.' });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: Get a single course
router.get('/my-courses/:courseId', studentAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.studentId.toString() !== req.student.id) return res.status(403).json({ message: 'Access denied' });

    res.json({ course });
  } catch (err) {
    console.error('Get single course error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
