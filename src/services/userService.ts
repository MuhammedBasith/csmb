import { User, IUser } from '../models/User';
import { Admin, IAdmin } from '../models/Admin';
import { Founder, IFounder } from '../models/Founder';
import { TokenBlacklist } from '../models/TokenBlacklist';
import { RefreshToken, IRefreshToken } from '../models/RefreshToken';
import { EmailService } from './emailService';
import AppError from '../utils/AppError';
import { RegisterFounderData, RegisterAdminData } from '../types/auth';
import { DurationType } from '../types/common';
import { parseDuration } from '../utils/timeUtils';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';

type StringValue = `${number}${string}`;

type FounderResult = {
  user: IUser;
  founder: IFounder;
};

type AdminResult = {
  user: IUser;
  admin: IAdmin;
};

type UserProfileResult = {
  user: IUser;
  profile: IFounder | IAdmin | null;
};

type AdminDetailResult = {
  user: IUser;
  admin: IAdmin;
};

type FounderDetailResult = {
  user: IUser;
  founder: IFounder;
};

export class UserService {
  static async createFounder(userData: RegisterFounderData): Promise<FounderResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userExists = await User.findOne({ email: userData.email });
      if (userExists) {
        throw new AppError('User already exists', 400);
      }

      const user = await User.create([{
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'founder'
      }], { session });

      const founder = await Founder.create([{
        userId: user[0]._id,
        companyName: userData.companyName,
        industry: userData.industry
      }], { session });

      await session.commitTransaction();
      return { user: user[0], founder: founder[0] };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async createAdmin(userData: RegisterAdminData): Promise<AdminResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userExists = await User.findOne({ email: userData.email });
      if (userExists) {
        throw new AppError('User already exists', 400);
      }

      const user = await User.create([{
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'admin'
      }], { session });

      const admin = await Admin.create([{
        userId: user[0]._id,
        bio: userData.bio
      }], { session });

      await session.commitTransaction();
      return { user: user[0], admin: admin[0] };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async findUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email }).select('+password');
  }

  static async findUserById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  static async getUserProfile(userId: string): Promise<UserProfileResult> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    let profile = null;
    if (user.role === 'founder') {
      profile = await Founder.findOne({ userId: user._id });
    } else if (user.role === 'admin') {
      profile = await Admin.findOne({ userId: user._id });
    }

    return { user, profile };
  }

  static async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    await TokenBlacklist.create({ token, expiresAt });
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await TokenBlacklist.findOne({ token });
    return !!blacklistedToken;
  }

  static async generatePasswordResetToken(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('No user found with that email', 404);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const expiresInMs = parseDuration(config.passwordReset.expiresIn);
    user.resetPasswordExpires = new Date(Date.now() + expiresInMs);

    await user.save();
    await EmailService.sendPasswordResetEmail(user.email, resetToken, user.name);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Set verified to true as the user has now set their password
    user.verified = true;
    
    await user.save();

    // Revoke all refresh tokens for this user
    await RefreshToken.updateMany(
      { userId: user._id },
      { isRevoked: true }
    );
  }

  static async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const payload = { id: user._id, role: user.role };
    const refreshExpiresIn = config.jwt.refreshExpiresIn as DurationType;
    const options: SignOptions = {
      expiresIn: refreshExpiresIn
    };
    
    const token = jwt.sign(
      payload,
      config.jwt.refreshSecret,
      options
    );

    try {
      const expiresInMs = parseDuration(refreshExpiresIn);
      const expires = new Date(Date.now() + expiresInMs);

      await RefreshToken.create({
        userId: user._id,
        token,
        expires,
        userAgent,
        ipAddress
      });

      return token;
    } catch (error) {
      throw new AppError('Invalid refresh token expiration', 500);
    }
  }

  static async verifyRefreshToken(token: string): Promise<IUser> {
    const refreshToken = await RefreshToken.findOne({
      token,
      isRevoked: false,
      expires: { $gt: Date.now() }
    });

    if (!refreshToken) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(refreshToken.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    const refreshToken = await RefreshToken.findOne({ token });
    if (refreshToken) {
      refreshToken.isRevoked = true;
      await refreshToken.save();
    }
  }

  static async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId: new mongoose.Types.ObjectId(userId) },
      { isRevoked: true }
    );
  }

  static async getAllAdmins(): Promise<AdminDetailResult[]> {
    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    // Get admin profiles for each user
    const adminDetails: AdminDetailResult[] = [];
    
    for (const user of adminUsers) {
      const admin = await Admin.findOne({ userId: user._id });
      if (admin) {
        adminDetails.push({ user, admin });
      }
    }
    
    return adminDetails;
  }

  static async getAllFounders(): Promise<FounderDetailResult[]> {
    // Find all founder users
    const founderUsers = await User.find({ role: 'founder' });
    
    // Get founder profiles for each user
    const founderDetails: FounderDetailResult[] = [];
    
    for (const user of founderUsers) {
      const founder = await Founder.findOne({ userId: user._id });
      if (founder) {
        founderDetails.push({ user, founder });
      }
    }
    
    return founderDetails;
  }

  static async generateWelcomeToken(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate welcome token
    const welcomeToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(welcomeToken)
      .digest('hex');
    
    // Set expiration to 24 hours (longer than the regular password reset)
    user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Set verified to false until they set their password
    user.verified = false;
    
    await user.save();
    
    // Send welcome email with the token
    await EmailService.sendWelcomeEmail(user.email, welcomeToken, user.name, user.role);
    
    return welcomeToken;
  }
}