import mongoose, { Document } from 'mongoose';

export type PostStatus = 'pending' | 'approved' | 'rejected' | 'scheduled' | 'posted';

export interface IPost extends Document {
  founderId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  images: string[];
  caption: string;
  status: PostStatus;
  feedback?: string;
  scheduledDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new mongoose.Schema({
  founderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Founder',
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  images: [{
    type: String
  }],
  caption: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'scheduled', 'posted'],
    default: 'pending'
  },
  feedback: {
    type: String,
    trim: true
  },
  scheduledDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
postSchema.index({ founderId: 1, status: 1 });
postSchema.index({ adminId: 1, status: 1 });
postSchema.index({ status: 1, scheduledDate: 1 });

export const Post = mongoose.model<IPost>('Post', postSchema);