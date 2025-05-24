import mongoose, { Document } from 'mongoose';

export interface IReport extends Document {
  founderId: mongoose.Types.ObjectId;
  month: string;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const reportSchema = new mongoose.Schema({
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
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reports for same founder and month
reportSchema.index({ founderId: 1, month: 1 }, { unique: true });

// Index for faster lookups
reportSchema.index({ founderId: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);