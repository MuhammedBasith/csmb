import mongoose, { Document } from 'mongoose';

export interface IFounder extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  industry?: string;
  notes?: string;
  createdAt: Date;
}

const founderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster lookups
founderSchema.index({ userId: 1 });

export const Founder = mongoose.model<IFounder>('Founder', founderSchema);