import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metricsService';
import { AssignmentService } from '../services/assignmentService';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const metricsController = {
  /**
   * Upload metrics for a founder
   * Accessible by: Admin (for assigned founders), Super Admin
   */
  uploadMetrics: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { founderId } = req.params;
    const { month, totalPosts, totalImpressions, totalCommentOutreach, notes } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    // Validate required fields
    if (!month || totalPosts === undefined || totalImpressions === undefined || totalCommentOutreach === undefined) {
      return next(new AppError('Please provide month, totalPosts, totalImpressions, and totalCommentOutreach', 400));
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return next(new AppError('Month must be in format YYYY-MM', 400));
    }

    // Check permissions for admin users
    if (userRole === 'admin') {
      // Get all founders assigned to this admin
      const assignments = await AssignmentService.getAssignedFounders(userId!);
      const assignedFounderIds = assignments.map(assignment => assignment.founderId.toString());
      
      // Check if the founder is assigned to this admin
      if (!assignedFounderIds.includes(founderId)) {
        return next(new AppError('You can only upload metrics for founders assigned to you', 403));
      }
    }

    // Upload metrics
    const metrics = await MetricsService.uploadMetrics(
      founderId,
      userId!,
      month,
      {
        totalPosts: Number(totalPosts),
        totalImpressions: Number(totalImpressions),
        totalCommentOutreach: Number(totalCommentOutreach),
        notes
      }
    );

    res.status(200).json({
      success: true,
      metrics
    });
  }),

  /**
   * Get metrics for a specific founder
   * Accessible by: Admin (for assigned founders), Super Admin, Founder (own metrics)
   */
  getFounderMetrics: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { founderId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Check permissions
    if (userRole === 'founder') {
      // Founders can only view their own metrics
      const founder = await AssignmentService.getFounderByUserId(userId!);
      if (!founder || founder.userId.toString() !== founderId) {
        return next(new AppError('You can only view your own metrics', 403));
      }
    } else if (userRole === 'admin') {
      // Admins can only view metrics for founders assigned to them
      const assignments = await AssignmentService.getAssignedFounders(userId!);
      const assignedFounderIds = assignments.map(assignment => assignment.founderId.toString());
      
      if (!assignedFounderIds.includes(founderId)) {
        return next(new AppError('You can only view metrics for founders assigned to you', 403));
      }
    }

    const metrics = await MetricsService.getFounderMetrics(founderId);

    res.status(200).json({
      success: true,
      metrics
    });
  }),

  /**
   * Get metrics for a specific founder for a specific month
   * Accessible by: Admin (for assigned founders), Super Admin, Founder (own metrics)
   */
  getFounderMonthlyMetrics: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { founderId, month } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return next(new AppError('Month must be in format YYYY-MM', 400));
    }

    // Check permissions
    if (userRole === 'founder') {
      // Founders can only view their own metrics
      const founder = await AssignmentService.getFounderByUserId(userId!);
      if (!founder || founder._id.toString() !== founderId) {
        return next(new AppError('You can only view your own metrics', 403));
      }
    } else if (userRole === 'admin') {
      // Admins can only view metrics for founders assigned to them
      const assignments = await AssignmentService.getAssignedFounders(userId!);
      const assignedFounderIds = assignments.map(assignment => assignment.founderId.toString());
      
      if (!assignedFounderIds.includes(founderId)) {
        return next(new AppError('You can only view metrics for founders assigned to you', 403));
      }
    }

    const metrics = await MetricsService.getFounderMonthlyMetrics(founderId, month);

    if (!metrics) {
      return next(new AppError('Metrics not found for the specified month', 404));
    }

    res.status(200).json({
      success: true,
      metrics
    });
  }),

  /**
   * Get all metrics for all founders assigned to an admin
   * Accessible by: Admin
   */
  getAdminMetrics: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.userId;
    const userRole = req.userRole;

    // Only admins can access this endpoint
    if (userRole !== 'admin') {
      return next(new AppError('Only admins can access this endpoint', 403));
    }

    // Get all founders assigned to this admin
    const assignments = await AssignmentService.getAssignedFounders(adminId!);
    const founderIds = assignments.map(assignment => assignment.founderId.toString());

    const metrics = await MetricsService.getAdminMetrics(adminId!, founderIds);

    res.status(200).json({
      success: true,
      metrics
    });
  }),

  /**
   * Get all metrics for all founders
   * Accessible by: Super Admin
   */
  getAllMetrics: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    // Only super admins can access this endpoint
    if (userRole !== 'super-admin') {
      return next(new AppError('Only super admins can access this endpoint', 403));
    }

    const metrics = await MetricsService.getAllMetrics();

    res.status(200).json({
      success: true,
      metrics
    });
  }),

  /**
   * Delete metrics
   * Accessible by: Admin (only for metrics they uploaded), Super Admin
   */
  deleteMetrics: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { metricsId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Get the metrics to check permissions
    const metrics = await MetricsService.getMetricsById(metricsId);
    
    if (!metrics) {
      return next(new AppError('Metrics not found', 404));
    }
    
    // Check permissions
    if (userRole === 'admin' && metrics.uploadedBy.toString() !== userId) {
      return next(new AppError('You can only delete metrics that you uploaded', 403));
    }

    const result = await MetricsService.deleteMetrics(metricsId);

    res.status(200).json({
      success: true,
      ...result
    });
  })
};
