import { ActivityLogs, IActivityLogs } from '../models/ActivityLogs';
import { UserRole } from '../models/User';
import mongoose from 'mongoose';

export class ActivityLogService {
  static async logActivity(
    userId: mongoose.Types.ObjectId | string,
    role: UserRole,
    action: string,
    meta: Record<string, any> = {}
  ): Promise<IActivityLogs> {
    return await ActivityLogs.create({
      userId: new mongoose.Types.ObjectId(userId),
      role,
      action,
      meta,
      timestamp: new Date()
    });
  }

  static async getUserActivities(
    userId: mongoose.Types.ObjectId | string,
    limit: number = 10
  ): Promise<IActivityLogs[]> {
    return await ActivityLogs.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getActivitiesByAction(
    action: string,
    limit: number = 10
  ): Promise<IActivityLogs[]> {
    return await ActivityLogs.find({ action })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getRecentActivities(
    limit: number = 10
  ): Promise<IActivityLogs[]> {
    return await ActivityLogs.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email');
  }
}