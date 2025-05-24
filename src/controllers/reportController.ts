import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';
import { AssignmentService } from '../services/assignmentService';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import path from 'path';
import mongoose from 'mongoose';
import { Report } from '../models/Report';
import { Founder } from '../models/Founder';
import { User } from '../models/User';

// Define an interface for the populated user details
interface IPopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
}

// The auth middleware already extends Express.Request with userId and userRole
// No need to redeclare here as it's already done in auth.ts

export const reportController = {
  /**
   * Upload a monthly report for a founder
   * Accessible by: Admin (only for assigned founders)
   */
  uploadReport: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { month } = req.body;
    const founderId = req.params.founderId;
    const adminId = req.userId;
    const file = req.file;

    if (!file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Verify admin is assigned to this founder
    const isAssigned = await AssignmentService.isAdminAssignedToFounder(adminId!, founderId);
    if (!isAssigned) {
      return next(new AppError('You are not authorized to upload reports for this founder', 403));
    }

    const report = await ReportService.uploadReport(file, founderId, adminId!, month);

    res.status(201).json({
      success: true,
      report
    });
  }),

  /**
   * Get all reports for a specific founder
   * Accessible by: Admin (only for assigned founders), Super Admin, Founder (only their own)
   */
  getFounderReports: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { founderId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Check permissions
    if (userRole === 'founder' && userId !== founderId) {
      return next(new AppError('You can only view your own reports', 403));
    }

    if (userRole === 'admin') {
      // Verify admin is assigned to this founder
      const isAssigned = await AssignmentService.isAdminAssignedToFounder(userId!, founderId);
      if (!isAssigned) {
        return next(new AppError('You are not authorized to view reports for this founder', 403));
      }
    }

    const reports = await ReportService.getFounderReports(founderId);

    res.status(200).json({
      success: true,
      reports
    });
  }),

  /**
   * Get a specific monthly report for a founder
   * Accessible by: Admin (only for assigned founders), Super Admin, Founder (only their own)
   */
  getFounderMonthlyReport: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { founderId, month } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Check permissions
    if (userRole === 'founder' && userId !== founderId) {
      return next(new AppError('You can only view your own reports', 403));
    }

    if (userRole === 'admin') {
      // Verify admin is assigned to this founder
      const isAssigned = await AssignmentService.isAdminAssignedToFounder(userId!, founderId);
      if (!isAssigned) {
        return next(new AppError('You are not authorized to view reports for this founder', 403));
      }
    }

    const report = await ReportService.getFounderMonthlyReport(founderId, month);

    if (!report) {
      return next(new AppError('Report not found', 404));
    }

    res.status(200).json({
      success: true,
      report
    });
  }),

  /**
   * Get all reports for all founders assigned to an admin
   * Accessible by: Admin
   */
  getAdminReports: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const adminId = req.userId;
  
    // 1. Get assigned founderIds (User._id) from assignments
    const assignments = await AssignmentService.getAssignedFounders(adminId!);
    const assignedFounderIds = assignments.map((a: any) => a.founderId.toString());
  
    // 2. Fetch reports for assigned founders or uploaded by admin
    const reports = await Report.find({
      $or: [
        { founderId: { $in: assignedFounderIds } },
        { founderId: null, uploadedBy: adminId }
      ]
    })
      .sort({ month: -1, founderId: 1 })
      .populate('uploadedBy', 'name email')
      .lean();
  
    // 3. Extract unique founderIds (User._id) from reports
    const uniqueFounderIds = Array.from(new Set(
      reports.map(r => r.founderId).filter(Boolean).map(id => id.toString())
    ));
  
    // 4. Fetch users with those IDs and map _id => name
    const users = await User.find({ _id: { $in: uniqueFounderIds } })
      .select('name')
      .lean();
  
    const userIdToNameMap: Record<string, string> = {};
    users.forEach(user => {
      userIdToNameMap[user._id.toString()] = user.name;
    });
  
    // 5. Add founderName to each report
    const enrichedReports = reports.map(report => ({
      ...report,
      founderName: report.founderId ? userIdToNameMap[report.founderId.toString()] || null : null
    }));
  
    // 6. Send response
    res.status(200).json({
      success: true,
      reports: enrichedReports
    });
  }),
  

  /**
   * Get all reports (for super admin)
   * Accessible by: Super Admin
   */
  getAllReports: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Fetch all reports
    const reports = await Report.find()
      .sort({ month: -1, founderId: 1 })
      .populate('uploadedBy', 'name email')
      .lean();
  
    // 2. Extract unique founderIds (User._id) from reports
    const uniqueFounderIds = Array.from(new Set(
      reports.map(r => r.founderId).filter(Boolean).map(id => id.toString())
    ));
  
    // 3. Fetch users and map _id => name
    const users = await User.find({ _id: { $in: uniqueFounderIds } })
      .select('name')
      .lean();
  
    const userIdToNameMap: Record<string, string> = {};
    users.forEach(user => {
      userIdToNameMap[user._id.toString()] = user.name;
    });
  
    // 4. Add founderName to each report
    const enrichedReports = reports.map(report => ({
      ...report,
      founderName: report.founderId ? userIdToNameMap[report.founderId.toString()] || null : null
    }));
  
    // 5. Send response
    res.status(200).json({
      success: true,
      reports: enrichedReports
    });
  }),
  

  /**
   * Delete a report
   * Accessible by: Admin (only for reports they uploaded), Super Admin
   */
  deleteReport: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { reportId } = req.params;
    const userId = req.userId;
    const userRole = req.userRole;

    // Get the report to check permissions
    const report = await ReportService.getReportById(reportId);
    
    if (!report) {
      return next(new AppError('Report not found', 404));
    }
    
    // Check permissions
    if (userRole === 'admin' && report.uploadedBy._id.toString() !== userId) {
      return next(new AppError('You can only delete reports that you uploaded', 403));
    }

    const result = await ReportService.deleteReport(reportId);

    res.status(200).json({
      success: true,
      ...result
    });
  })
};
