import mongoose, { Schema, Document } from 'mongoose';

export interface IVeterinarian extends Document {
  vetId: mongoose.Types.ObjectId;
  licenseNumber: string;
  businessRegistrationNumber: string;
  specialization: string;
  credentials: string;
  isVerified: boolean;
  verificationDocuments: string[];
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  blockedDates: Date[];
}

const VeterinarianSchema = new Schema<IVeterinarian>({
  vetId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  licenseNumber: { type: String, required: true, trim: true },
  businessRegistrationNumber: { type: String, trim: true },
  specialization: { type: String },
  credentials: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [{ type: String }],
  availability: [{ dayOfWeek: { type: Number }, startTime: { type: String }, endTime: { type: String } }],
  blockedDates: [{ type: Date }],
});

VeterinarianSchema.index({ vetId: 1 });

export default mongoose.models.Veterinarian || mongoose.model<IVeterinarian>('Veterinarian', VeterinarianSchema);