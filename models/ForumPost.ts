import mongoose, { Schema, Document } from 'mongoose';

export interface IForumPost extends Document {
  authorId: mongoose.Types.ObjectId;
  category: 'health' | 'nutrition' | 'training' | 'general';
  title: string;
  content: string;
  images: string[];
  upvotes: mongoose.Types.ObjectId[];
  downvotes: mongoose.Types.ObjectId[];
  isFlagged: boolean;
  isModerated: boolean;
  followers: mongoose.Types.ObjectId[];
  views: number;
  moderationReason?: string;
  removedAt?: Date;
  replies: {
    replyId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    content: string;
    isVetVerified: boolean;
    upvotes: mongoose.Types.ObjectId[];
    images: string[];
    createdAt: Date;
  }[];
  createdAt: Date;
}

const ForumPostSchema = new Schema<IForumPost>({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['health', 'nutrition', 'training', 'general'], required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  images: [{ type: String }],
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isFlagged: { type: Boolean, default: false },
  isModerated: { type: Boolean, default: false },
  moderationReason: String,
  removedAt: Date,
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  replies: [{
    replyId: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    isVetVerified: { type: Boolean, default: false },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

ForumPostSchema.index({ category: 1 });
ForumPostSchema.index({ authorId: 1 });
ForumPostSchema.index({ title: 'text', content: 'text' });

export default mongoose.models.ForumPost || mongoose.model<IForumPost>('ForumPost', ForumPostSchema);
