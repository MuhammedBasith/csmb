import { Request, Response, NextFunction } from 'express';
import { AdminDashboardService } from '../services/adminDashboardService';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const adminDashboardController = {
  /**
   * Get main dashboard statistics for an admin
   * Accessible by: Admin (own dashboard)
   */
  getAdminDashboardStats: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.userId;
    const userRole = req.userRole;

    // Only admins can access their own dashboard
    if (userRole !== 'admin') {
      return next(new AppError('Only admins can access this endpoint', 403));
    }

    const stats = await AdminDashboardService.getAdminDashboardStats(adminId!);

    res.status(200).json({
      success: true,
      stats
    });
  }),

  /**
   * Get recent activities for an admin's dashboard
   * Accessible by: Admin (own dashboard)
   */
  getAdminRecentActivities: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.userId;
    const userRole = req.userRole;

    // Only admins can access their own dashboard
    if (userRole !== 'admin') {
      return next(new AppError('Only admins can access this endpoint', 403));
    }

    const activities = await AdminDashboardService.getAdminRecentActivities(adminId!);

    res.status(200).json({
      success: true,
      activities
    });
  }),

  /**
   * Get graph data for an admin's dashboard
   * Accessible by: Admin (own dashboard)
   */
  getAdminGraphData: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.userId;
    const userRole = req.userRole;

    // Only admins can access their own dashboard
    if (userRole !== 'admin') {
      return next(new AppError('Only admins can access this endpoint', 403));
    }

    const graphData = await AdminDashboardService.getAdminGraphData(adminId!);

    res.status(200).json({
      success: true,
      graphData
    });
  }),

  /**
   * Get all dashboard data for an admin in a single request
   * Accessible by: Admin (own dashboard)
   */
  getAdminDashboardAll: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.userId;
    const userRole = req.userRole;

    // Only admins can access their own dashboard
    if (userRole !== 'admin') {
      return next(new AppError('Only admins can access this endpoint', 403));
    }

    const dashboard = await AdminDashboardService.getAdminDashboardAll(adminId!);

    res.status(200).json({
      success: true,
      dashboard
    });
  })
};
