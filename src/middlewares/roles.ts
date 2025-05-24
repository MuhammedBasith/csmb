import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';

export const checkRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.userRole !== requiredRole) {
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  };
};
