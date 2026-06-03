import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultation extends Document {
  appointmentId: mongoose.Types.ObjectId;
  vetId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  petId: mongoose.Types.ObjectId;
  type: 'routine' | 'emergency';
  notes: string;
  diagnosis: string;
  prescription: string;
  duration: number;
  callQuality: number;
  recordingMetadata: string;
  createdAt: Date;
}

const ConsultationSchema = new Schema<IConsultation>({
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
  vetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
  type: { type: String, enum: ['routine', 'emergency'], default: 'routine' },
  notes: { type: String },
  diagnosis: { type: String },
  prescription: { type: String },
  duration: { type: Number },
  callQuality: { type: Number },
  recordingMetadata: { type: String },
  createdAt: { type: Date, default: Date.now },
});

ConsultationSchema.index({ vetId: 1 });
ConsultationSchema.index({ petId: 1 });

export default mongoose.models.Consultation || mongoose.model<IConsultation>('Consultation', ConsultationSchema);
