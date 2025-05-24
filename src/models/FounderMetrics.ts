import mongoose, { Document } from 'mongoose';

export interface IFounderMetrics extends Document {
  founderId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  month: string; // Format: YYYY-MM
  totalPosts: number;
  totalImpressions: number;
  totalCommentOutreach: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const founderMetricsSchema = new mongoose.Schema({
  founderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Founder',
    required: [true, 'Founder ID is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader ID is required']
  },
  month: {
    type: String,
    required: [true, 'Month is required (format: YYYY-MM)'],
    match: [/^\d{4}-\d{2}$/, 'Month must be in format YYYY-MM']
  },
  totalPosts: {
    type: Number,
    required: [true, 'Total posts is required'],
    min: [0, 'Total posts cannot be negative']
  },
  totalImpressions: {
    type: Number,
    required: [true, 'Total impressions is required'],
    min: [0, 'Total impressions cannot be negative']
  },
  totalCommentOutreach: {
    type: Number,
    required: [true, 'Total comment outreach is required'],
    min: [0, 'Total comment outreach cannot be negative']
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness of founder metrics per month
founderMetricsSchema.index({ founderId: 1, month: 1 }, { unique: true });

// Indexes for faster lookups
founderMetricsSchema.index({ founderId: 1 });
founderMetricsSchema.index({ uploadedBy: 1 });
founderMetricsSchema.index({ month: 1 });

export const FounderMetrics = mongoose.model<IFounderMetrics>('FounderMetrics', founderMetricsSchema);
