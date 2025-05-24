import mongoose, { Document } from 'mongoose';
import { UserRole } from './User';

export interface IActivityLogs extends Document {
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  action: string;
  meta: Record<string, any>;
  timestamp: Date;
}

const activityLogsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['super-admin', 'admin', 'founder'],
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster lookups
activityLogsSchema.index({ userId: 1, timestamp: -1 });
activityLogsSchema.index({ action: 1, timestamp: -1 });
activityLogsSchema.index({ timestamp: -1 });

export const ActivityLogs = mongoose.model<IActivityLogs>('ActivityLogs', activityLogsSchema);