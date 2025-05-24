import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User, UserRole } from '../models/User';
import { UserService } from '../services/userService';
import AppError from '../utils/AppError';

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // Check if token is blacklisted
    const isBlacklisted = await UserService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next(new AppError('Token is no longer valid', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; role: UserRole };
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Add user info to request
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else {
      next(new AppError('Not authorized to access this route', 401));
    }
  }
};
