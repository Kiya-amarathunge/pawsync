import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  message: string;
  isRead: boolean;
  deliveredViaSMS: boolean;
  deliveredViaEmail: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  deliveredViaSMS: { type: Boolean, default: false },
  deliveredViaEmail: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
