import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import AppError from '../utils/AppError';

/**
 * Middleware to authorize users based on roles
 * @param roles Allowed roles for the route
 * @returns Middleware function
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;
    
    if (!userRole || !roles.includes(userRole as UserRole)) {
      return next(new AppError(`Role ${userRole} is not authorized to access this route`, 403));
    }
    
    next();
  };
};
