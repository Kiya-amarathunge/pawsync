import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  message: string;
  isRead: boolean;
  deliveredViaSMS: boolean;
  deliveredViaEmail: boolean;
  createdAt: Date;
  relatedEntityId?: mongoose.Types.ObjectId;
  actionUrl?: string;
  deliveredViaPush: boolean;
  dedupeKey?: string;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  deliveredViaSMS: { type: Boolean, default: false },
  deliveredViaEmail: { type: Boolean, default: false },
  deliveredViaPush: { type: Boolean, default: false },
  relatedEntityId: { type: Schema.Types.ObjectId },
  actionUrl: String,
  dedupeKey: String,
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, dedupeKey: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
