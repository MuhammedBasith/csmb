import mongoose, { Document } from 'mongoose';

export interface IAssignment extends Document {
  founderId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
}

const assignmentSchema = new mongoose.Schema({
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
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate assignments
assignmentSchema.index({ founderId: 1, adminId: 1 }, { unique: true });

// Indexes for faster lookups
assignmentSchema.index({ founderId: 1 });
assignmentSchema.index({ adminId: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);