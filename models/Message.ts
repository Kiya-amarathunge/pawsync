import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  attachments: string[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
