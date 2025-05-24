import express from 'express';
import { adminDashboardController } from '../controllers/adminDashboardController';
import { protect } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';

const router = express.Router();

// Get main dashboard statistics for an admin
// GET /api/v1/admin-dashboard/stats
router.get(
  '/stats',
  protect,
  authorize('admin'),
  adminDashboardController.getAdminDashboardStats
);

// Get recent activities for an admin's dashboard
// GET /api/v1/admin-dashboard/activities
router.get(
  '/activities',
  protect,
  authorize('admin'),
  adminDashboardController.getAdminRecentActivities
);

// Get graph data for an admin's dashboard
// GET /api/v1/admin-dashboard/graphs
router.get(
  '/graphs',
  protect,
  authorize('admin'),
  adminDashboardController.getAdminGraphData
);

// Get all dashboard data for an admin in a single request
// GET /api/v1/admin-dashboard/all
router.get(
  '/all',
  protect,
  authorize('admin'),
  adminDashboardController.getAdminDashboardAll
);

export default router;
