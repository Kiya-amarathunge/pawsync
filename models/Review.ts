import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  appointmentId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  photos: string[];
  providerResponse: string;
  isModerated: boolean;
  editDeadline: Date;
  createdAt: Date;
  isFlagged: boolean;
  moderationReason?: string;
  removedAt?: Date;
}

const ReviewSchema = new Schema<IReview>({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, minlength: 50 },
  photos: [{ type: String }],
  providerResponse: { type: String },
  isModerated: { type: Boolean, default: false },
  editDeadline: { type: Date },
  createdAt: { type: Date, default: Date.now },
  isFlagged: { type: Boolean, default: false },
  moderationReason: String,
  removedAt: Date,
});

ReviewSchema.index({ providerId: 1 });
ReviewSchema.index({ ownerId: 1 });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
