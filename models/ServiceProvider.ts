import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceProvider extends Document {
  providerId: mongoose.Types.ObjectId;
  businessName: string;
  businessRegistrationNumber: string;
  serviceType: string[];
  credentials: string;
  specialization: string;
  location: { address: string; lat: number; lng: number };
  yearsOfExperience: number;
  isVerified: boolean;
  verificationDocuments: string[];
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
  blockedDates: Date[];
  pricing: { service: string; price: number; duration: number }[];
  responseRate: number;
  acceptanceRate: number;
  businessDescription: string;
  photos: string[];
  serviceRadiusKm: number;
}

const ServiceProviderSchema = new Schema<IServiceProvider>({
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: { type: String, required: true, trim: true },
  businessRegistrationNumber: { type: String, trim: true },
  serviceType: [{ type: String }],
  credentials: { type: String },
  specialization: { type: String },
  location: { address: { type: String }, lat: { type: Number }, lng: { type: Number } },
  yearsOfExperience: { type: Number },
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [{ type: String }],
  availability: [{ dayOfWeek: { type: Number }, startTime: { type: String }, endTime: { type: String } }],
  blockedDates: [{ type: Date }],
  pricing: [{ service: { type: String }, price: { type: Number }, duration: { type: Number, default: 60 } }],
  responseRate: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 0 },
  businessDescription: { type: String, maxlength: 3000 },
  photos: [{ type: String }],
  serviceRadiusKm: { type: Number, default: 50, min: 1, max: 500 },
});

ServiceProviderSchema.index({ providerId: 1 });
ServiceProviderSchema.index({ 'location.lat': 1, 'location.lng': 1 });

export default mongoose.models.ServiceProvider || mongoose.model<IServiceProvider>('ServiceProvider', ServiceProviderSchema);
