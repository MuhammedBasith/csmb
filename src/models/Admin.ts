import mongoose, { Document } from 'mongoose';

export interface IAdmin extends Document {
  userId: mongoose.Types.ObjectId;
  bio?: string;
  createdAt: Date;
}

const adminSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster lookups
adminSchema.index({ userId: 1 });

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);