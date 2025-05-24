import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import { UserService } from '../services/userService';
import { ActivityLogService } from '../services/activityLogService';
import { AuthResponse, RegisterFounderData, RegisterAdminData, UserProfile, AuthResponseWithRefresh } from '../types/auth';
import { DurationType } from '../types/common';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { IFounder } from '../models/Founder';
import { IAdmin } from '../models/Admin';
import bcrypt from 'bcryptjs';


type StringValue = `${number}${string}`;

const createProfileResponse = (role: string, profile: IFounder | IAdmin | null): UserProfile => {
  if (!profile) return {};
  
  if (role === 'founder') {
    const founderProfile = profile as IFounder;
    return {
      companyName: founderProfile.companyName,
      industry: founderProfile.industry
    };
  } else {
    const adminProfile = profile as IAdmin;
    return {
      bio: adminProfile.bio
    };
  }
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const { role, sendWelcomeEmail = true } = req.body;

  const result = role === 'founder'
    ? await UserService.createFounder(req.body as RegisterFounderData)
    : role === 'admin'
    ? await UserService.createAdmin(req.body as RegisterAdminData)
    : null;

  if (!result) {
    throw new AppError('Invalid role specified', 400);
  }

  const token = result.user.generateAuthToken();

  // Log the registration activity
  await ActivityLogService.logActivity(
    req.userId!, 
    'super-admin',
    'Created New User',
    {
      createdUserId: result.user.id,
      userRole: role,
      userName: result.user.name,
      userEmail: result.user.email
    }
  );

  // Send welcome email with password setup link if requested
  if (sendWelcomeEmail) {
    await UserService.generateWelcomeToken(result.user.id);
  }

  const profile = role === 'founder'
    ? { companyName: (result as any).founder.companyName, industry: (result as any).founder.industry }
    : { bio: (result as any).admin.bio };

  const response: AuthResponse = {
    success: true,
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      verified: result.user.verified,
      profile
    }
  };

  res.status(201).json(response);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  

  const user = await UserService.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const { user: userWithProfile, profile } = await UserService.getUserProfile(user.id);
  const token = user.generateAuthToken();
  
  // Generate refresh token with user agent and IP information
  const refreshToken = await UserService.generateRefreshToken(
    user.id,
    req.headers['user-agent'],
    req.ip
  );

  // Log the login activity
  await ActivityLogService.logActivity(
    user.id,
    user.role,
    'User Login',
    {
      userEmail: user.email,
      loginTime: new Date()
    }
  );

  const response: AuthResponseWithRefresh = {
    success: true,
    token,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      profile: createProfileResponse(user.role, profile)
    }
  };

  res.status(200).json(response);
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const refreshToken = req.body.refreshToken;

  // Blacklist the access token
  if (authHeader && authHeader.startsWith('Bearer')) {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token) as { exp: number };
    if (decoded && decoded.exp) {
      await UserService.blacklistToken(token, new Date(decoded.exp * 1000));
    }
  }

  // Revoke the refresh token if provided
  if (refreshToken) {
    await UserService.revokeRefreshToken(refreshToken);
  }

  // Log the logout activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'User Logout',
    {
      logoutTime: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const { user, profile } = await UserService.getUserProfile(req.userId!);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const response: AuthResponse = {
    success: true,
    token: req.headers.authorization?.split(' ')[1] || '',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      profile: createProfileResponse(user.role, profile)
    }
  };

  res.status(200).json(response);
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await UserService.generatePasswordResetToken(email);

  res.status(200).json({
    success: true,
    message: 'Password reset email sent'
  });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  await UserService.resetPassword(token, password);

  res.status(200).json({
    success: true,
    message: 'Password has been reset'
  });
});

export const sendWelcomeEmail = catchAsync(async (req: Request, res: Response) => {
  // Only super-admin can send welcome emails
  if (req.userRole !== 'super-admin') {
    throw new AppError('Not authorized to perform this action', 403);
  }

  const { userId } = req.params;
  
  // Generate welcome token and send email
  await UserService.generateWelcomeToken(userId);

  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    'super-admin',
    'Sent Welcome Email',
    {
      targetUserId: userId,
      timestamp: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: 'Welcome email has been sent successfully'
  });
});

export const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  // Only super-admin can access this endpoint
  if (req.userRole !== 'super-admin') {
    throw new AppError('Not authorized to access this resource', 403);
  }

  const admins = await UserService.getAllAdmins();
  
  const formattedAdmins = admins.map(({ user, admin }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    bio: admin.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));

  res.status(200).json({
    success: true,
    count: formattedAdmins.length,
    data: formattedAdmins
  });
});

export const getAllFounders = catchAsync(async (req: Request, res: Response) => {
  // Only super-admin can access this endpoint
  if (req.userRole !== 'super-admin') {
    throw new AppError('Not authorized to access this resource', 403);
  }

  const founders = await UserService.getAllFounders();
  
  const formattedFounders = founders.map(({ user, founder }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    companyName: founder.companyName,
    industry: founder.industry,
    notes: founder.notes,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));

  res.status(200).json({
    success: true,
    count: formattedFounders.length,
    data: formattedFounders
  });
});

/**
 * Get user profile by ID
 * GET /auth/users/:userId
 */
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  // Check if the requester is the user in question or a super-admin
  if (req.userRole !== 'super-admin' && req.userId !== userId) {
    throw new AppError('Not authorized to access this resource', 403);
  }

  const { user, profile } = await UserService.getUserProfile(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const response: AuthResponse = {
    success: true,
    token: req.headers.authorization?.split(' ')[1] || '',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      profile: createProfileResponse(user.role, profile)
    }
  };

  res.status(200).json(response);
});

export const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const user = await UserService.verifyRefreshToken(refreshToken);

  const payload = { id: user.id, role: user.role };
  const jwtExpiresIn = config.jwt.expiresIn as DurationType;
  const options: SignOptions = { 
    expiresIn: jwtExpiresIn
  };
  
  const accessToken = jwt.sign(
    payload,
    config.jwt.secret,
    options
  );

  res.status(200).json({
    success: true,
    accessToken
  });
});

export const revokeRefreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await UserService.revokeRefreshToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Refresh token revoked'
  });
});