import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AssignmentService } from '../services/assignmentService';
import AppError from '../utils/AppError';
import { ActivityLogService } from '../services/activityLogService';

/**
 * Assign admins to a founder
 * POST /assignments
 */
export const assignAdminsToFounder = catchAsync(async (req: Request, res: Response) => {
  // Only super-admin can assign admins to founders
  if (req.userRole !== 'super-admin') {
    throw new AppError('Not authorized to perform this action', 403);
  }

  const { founderId, adminIds } = req.body;

  if (!founderId || !adminIds || !Array.isArray(adminIds)) {
    throw new AppError('Invalid request data', 400);
  }

  await AssignmentService.assignAdminsToFounder(founderId, adminIds, req.userId!);

  // Log the assignment activity
  await ActivityLogService.logActivity(
    req.userId!,
    'super-admin',
    'Assigned Admins to Founder',
    {
      founderId,
      adminIds,
      timestamp: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: `Successfully assigned ${adminIds.length} admin(s) to founder`
  });
});

/**
 * Get all admins assigned to a founder OR get all assignments for an admin
 * GET /assignments?founderId=... OR GET /assignments?adminId=...
 */
export const getAssignedAdmins = catchAsync(async (req: Request, res: Response) => {
  const { founderId, adminId } = req.query;

  // Case 1: Admin wants to see their own assignments
  if (adminId && typeof adminId === 'string') {
    // Allow admins to view their own assignments
    if (req.userRole === 'admin' && req.userId !== adminId) {
      throw new AppError('You can only view your own assignments', 403);
    }
    
    // Get assignments for this admin
    const assignments = await AssignmentService.getAssignedFounders(adminId);
    
    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  }
  
  // Case 2: Super-admin wants to see admins assigned to a founder
  if (founderId && typeof founderId === 'string') {
    // Only super-admin can view all assignments for a founder
    if (req.userRole !== 'super-admin') {
      throw new AppError('Not authorized to perform this action', 403);
    }
    
    const admins = await AssignmentService.getAssignedAdmins(founderId);
    
    return res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
  }
  
  // If neither adminId nor founderId is provided
  throw new AppError('Either Admin ID or Founder ID is required', 400);
});

/**
 * Get all founders assigned to an admin
 * GET /assignments/founders?adminId=...
 */
export const getAssignedFounders = catchAsync(async (req: Request, res: Response) => {
  const { adminId, counts } = req.query;

  if (!adminId || typeof adminId !== 'string') {
    throw new AppError('Admin ID is required', 400);
  }

  // Check if the requester is the admin in question or a super-admin
  if (req.userRole !== 'super-admin' && req.userId !== adminId) {
    throw new AppError('Not authorized to perform this action', 403);
  }

  // Check if post counts are requested
  const includeCounts = counts === 'true';
  
  const assignments = await AssignmentService.getAssignedFounders(adminId, includeCounts);

  res.status(200).json({
    success: true,
    assignments
  });
});

/**
 * Delete a specific assignment between an admin and a founder
 * DELETE /assignments/:adminId/:founderId
 */
export const deleteAssignment = catchAsync(async (req: Request, res: Response) => {
  // Only super-admin can delete assignments
  if (req.userRole !== 'super-admin') {
    throw new AppError('Not authorized to perform this action', 403);
  }

  const { adminId, founderId } = req.params;

  if (!adminId || !founderId) {
    throw new AppError('Admin ID and Founder ID are required', 400);
  }

  await AssignmentService.deleteAssignment(adminId, founderId);

  // Log the deletion activity
  await ActivityLogService.logActivity(
    req.userId!,
    'super-admin',
    'Deleted Admin-Founder Assignment',
    {
      adminId,
      founderId,
      timestamp: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: 'Assignment deleted successfully'
  });
});
