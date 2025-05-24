import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import AppError from '../utils/AppError';
import { Assignment } from '../models/Assignment';

type PermissionHandler = (req: Request, userId: string, userRole: UserRole) => Promise<boolean>;

const permissions: Record<string, PermissionHandler> = {
  // Founder permissions
  canAccessFounderContent: async (req, userId, userRole) => {
    if (userRole === 'super-admin') return true;
    if (userRole === 'founder') return req.params.founderId === userId;
    if (userRole === 'admin') {
      const assignment = await Assignment.findOne({
        founderId: req.params.founderId,
        adminId: userId
      });
      return !!assignment;
    }
    return false;
  },

  // Admin permissions
  canManageContent: async (req, userId, userRole) => {
    if (userRole === 'super-admin') return true;
    if (userRole === 'admin') {
      if (req.params.founderId) {
        const assignment = await Assignment.findOne({
          founderId: req.params.founderId,
          adminId: userId
        });
        return !!assignment;
      }
      return true;
    }
    return false;
  },

  // Super Admin permissions
  canManageUsers: async (req, userId, userRole) => {
    return userRole === 'super-admin';
  }
};

export const checkPermission = (permissionKey: keyof typeof permissions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId || !req.userRole) {
        throw new AppError('Not authenticated', 401);
      }

      const hasPermission = await permissions[permissionKey](
        req,
        req.userId,
        req.userRole
      );

      if (!hasPermission) {
        throw new AppError('You do not have permission to perform this action', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};