import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergencyContact extends Document {
  name: string;
  address: string;
  phone: string;
  location: { lat: number; lng: number };
  is24Hours: boolean;
  specializations: string[];
  isVerified: boolean;
  isAvailable: boolean;
  availabilityUpdatedAt?: Date;
  linkedProviderId?: mongoose.Types.ObjectId;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  is24Hours: { type: Boolean, default: false },
  specializations: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  availabilityUpdatedAt: Date,
  linkedProviderId: { type: Schema.Types.ObjectId, ref: 'User' },
});

EmergencyContactSchema.index({ 'location.lat': 1, 'location.lng': 1 });

export default mongoose.models.EmergencyContact || mongoose.model<IEmergencyContact>('EmergencyContact', EmergencyContactSchema);
