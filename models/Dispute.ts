import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IDispute extends Document {
  appointmentId: mongoose.Types.ObjectId;
  openedBy: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  category: 'service_quality' | 'cancellation' | 'billing' | 'refund' | 'conduct' | 'other';
  subject: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution?: string;
  resolutionAction?: 'mediate' | 'cancel' | 'refund' | 'dismiss';
  refundAmount?: number;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
  openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['service_quality', 'cancellation', 'billing', 'refund', 'conduct', 'other'],
    required: true,
  },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'dismissed'],
    default: 'open',
  },
  resolution: { type: String, trim: true, maxlength: 5000 },
  resolutionAction: { type: String, enum: ['mediate', 'cancel', 'refund', 'dismiss'] },
  refundAmount: Number,
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });

DisputeSchema.index({ ownerId: 1, createdAt: -1 });
DisputeSchema.index({ providerId: 1, createdAt: -1 });
DisputeSchema.index({ status: 1, createdAt: -1 });
DisputeSchema.index(
  { appointmentId: 1, openedBy: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['open', 'under_review'] } } },
);

const Dispute: Model<IDispute> =
  (mongoose.models.Dispute as Model<IDispute>) || mongoose.model<IDispute>('Dispute', DisputeSchema);

export default Dispute;
