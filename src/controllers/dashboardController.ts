import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const dashboardController = {
  /**
   * Get main dashboard statistics
   * Accessible by: Super Admin
   */
  getMainDashboardStats: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    // Only super admins can access this endpoint
    if (userRole !== 'super-admin') {
      return next(new AppError('Only super admins can access this endpoint', 403));
    }

    const stats = await DashboardService.getMainDashboardStats();

    res.status(200).json({
      success: true,
      stats
    });
  }),

  /**
   * Get recent activities for dashboard
   * Accessible by: Super Admin
   */
  getRecentActivities: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    // Only super admins can access this endpoint
    if (userRole !== 'super-admin') {
      return next(new AppError('Only super admins can access this endpoint', 403));
    }

    const activities = await DashboardService.getRecentActivities();

    res.status(200).json({
      success: true,
      activities
    });
  }),

  /**
   * Get graph data for dashboard
   * Accessible by: Super Admin
   */
  getGraphData: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    // Only super admins can access this endpoint
    if (userRole !== 'super-admin') {
      return next(new AppError('Only super admins can access this endpoint', 403));
    }

    const graphData = await DashboardService.getGraphData();

    res.status(200).json({
      success: true,
      graphData
    });
  }),

  /**
   * Get all dashboard data in a single request
   * Accessible by: Super Admin
   */
  getAllDashboardData: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    // Only super admins can access this endpoint
    if (userRole !== 'super-admin') {
      return next(new AppError('Only super admins can access this endpoint', 403));
    }

    // Get all data in parallel
    const [mainStats, recentActivities, graphData] = await Promise.all([
      DashboardService.getMainDashboardStats(),
      DashboardService.getRecentActivities(),
      DashboardService.getGraphData()
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        mainStats,
        recentActivities,
        graphData
      }
    });
  })
};
