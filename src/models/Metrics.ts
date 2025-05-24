import mongoose, { Document } from 'mongoose';

export interface IMetrics extends Document {
  founderId: mongoose.Types.ObjectId;
  month: string;
  impressions: number;
  engagementRate: number;
  comments: number;
  reactions: number;
  followerGrowth: number;
  submittedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const metricsSchema = new mongoose.Schema({
  founderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Founder',
    required: true
  },
  month: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid month format (YYYY-MM)!`
    }
  },
  impressions: {
    type: Number,
    required: true,
    min: 0
  },
  engagementRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  comments: {
    type: Number,
    required: true,
    min: 0
  },
  reactions: {
    type: Number,
    required: true,
    min: 0
  },
  followerGrowth: {
    type: Number,
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate metrics for same founder and month
metricsSchema.index({ founderId: 1, month: 1 }, { unique: true });

// Index for faster lookups
metricsSchema.index({ founderId: 1, createdAt: -1 });

export const Metrics = mongoose.model<IMetrics>('Metrics', metricsSchema);