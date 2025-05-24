import express from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middlewares/authenticate';

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticate);

// Dashboard routes
router.get('/stats', dashboardController.getMainDashboardStats);
router.get('/activities', dashboardController.getRecentActivities);
router.get('/graphs', dashboardController.getGraphData);
router.get('/all', dashboardController.getAllDashboardData);

export default router;
