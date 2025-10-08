import express from 'express';
import auth from '../middleware/auth.js';
import {
  createInstitute,
  getInstitutes,
  getInstituteById,
  updateInstitute,
  deleteInstitute,
  getInstitutePerformance,
  getRevenueAnalytics,
  getInstituteTypes
} from '../controllers/instituteController.js';

const router = express.Router();

// Create institute
router.post('/', auth, createInstitute);

// Get all institutes with filtering and pagination
router.get('/', auth, getInstitutes);

// Get institute types and categories
router.get('/types', auth, getInstituteTypes);

// Get institute performance analytics
router.get('/performance', auth, getInstitutePerformance);

// Get revenue analytics
router.get('/revenue', auth, getRevenueAnalytics);

// Get institute by ID with detailed statistics
router.get('/:id', auth, getInstituteById);

// Update institute
router.put('/:id', auth, updateInstitute);

// Delete institute
router.delete('/:id', auth, deleteInstitute);

console.log("✅ Enhanced institute routes loaded");

export default router;
