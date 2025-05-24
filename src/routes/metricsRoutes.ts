import express from 'express';
import { metricsController } from '../controllers/metricsController';
import { protect, authorize } from '../middlewares/auth';

const router = express.Router();

// Upload metrics for a founder
// POST /api/v1/metrics/founders/:founderId
router.post(
  '/founders/:founderId',
  protect,
  authorize('admin', 'super-admin'),
  metricsController.uploadMetrics
);

// Get all metrics for a specific founder
// GET /api/v1/metrics/founders/:founderId
router.get(
  '/founders/:founderId',
  protect,
  metricsController.getFounderMetrics
);

// Get metrics for a specific founder for a specific month
// GET /api/v1/metrics/founders/:founderId/:month
router.get(
  '/founders/:founderId/:month',
  protect,
  metricsController.getFounderMonthlyMetrics
);

// Get all metrics for all founders assigned to an admin (Admin only)
// GET /api/v1/metrics/admin
router.get(
  '/admin',
  protect,
  authorize('admin'),
  metricsController.getAdminMetrics
);

// Get all metrics (Super Admin only)
// GET /api/v1/metrics
router.get(
  '/',
  protect,
  authorize('super-admin'),
  metricsController.getAllMetrics
);

// Delete metrics
// DELETE /api/v1/metrics/:metricsId
router.delete(
  '/:metricsId',
  protect,
  authorize('admin', 'super-admin'),
  metricsController.deleteMetrics
);

export default router;
