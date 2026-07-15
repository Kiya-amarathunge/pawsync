import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergencyEvent extends Document {
  ownerId: mongoose.Types.ObjectId;
  petId?: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  eventType: 'clinic_contact' | 'boarding_request';
  reason: string;
  recordsShared: boolean;
  createdAt: Date;
}

const EmergencyEventSchema = new Schema<IEmergencyEvent>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  petId: { type: Schema.Types.ObjectId, ref: 'Pet' },
  clinicId: { type: Schema.Types.ObjectId, ref: 'EmergencyContact' },
  eventType: { type: String, enum: ['clinic_contact', 'boarding_request'], required: true },
  reason: { type: String, maxlength: 2000 },
  recordsShared: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
EmergencyEventSchema.index({ ownerId: 1, createdAt: -1 });
export default mongoose.models.EmergencyEvent || mongoose.model<IEmergencyEvent>('EmergencyEvent', EmergencyEventSchema);
