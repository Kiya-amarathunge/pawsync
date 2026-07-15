import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  role: 'pet_owner' | 'veterinarian' | 'service_provider' | 'admin';
  registrationDate: Date;
  isVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  lastLoginAt?: Date;
  favoriteProviders: mongoose.Types.ObjectId[];
  notificationPreferences: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    appointmentReminders: boolean;
    healthReminders: boolean;
    messages: boolean;
    reviews: boolean;
    announcements: boolean;
  };
  adminRole?: 'super_admin' | 'content_moderator' | 'verification_specialist';
  verificationStatus?: 'pending' | 'more_info_requested' | 'approved' | 'rejected';
  verificationNote?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['pet_owner', 'veterinarian', 'service_provider', 'admin'],
    required: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: Date,
  favoriteProviders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  notificationPreferences: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    appointmentReminders: { type: Boolean, default: true },
    healthReminders: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    reviews: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
  },
  adminRole: { type: String, enum: ['super_admin', 'content_moderator', 'verification_specialist'] },
  verificationStatus: { type: String, enum: ['pending', 'more_info_requested', 'approved', 'rejected'], default: 'pending' },
  verificationNote: String,
});

/**
 * Hash password before saving
 */
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);
});

/**
 * Compare password method
 */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Indexes (keep ONLY what is not already "unique: true")
 * email already has unique index → DO NOT duplicate it
 */
UserSchema.index({ role: 1 });

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
