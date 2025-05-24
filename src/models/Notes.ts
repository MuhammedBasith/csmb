import mongoose, { Document } from 'mongoose';

export interface INotes extends Document {
  founderId: mongoose.Types.ObjectId;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notesSchema = new mongoose.Schema({
  founderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Founder',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
notesSchema.index({ founderId: 1, createdAt: -1 });
notesSchema.index({ createdBy: 1, createdAt: -1 });

export const Notes = mongoose.model<INotes>('Notes', notesSchema);