import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  petId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  serviceType: 'veterinary' | 'grooming' | 'training' | 'boarding' | 'telemedicine';
  dateTime: Date;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  price: number;
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: {
    type: String,
    enum: ['veterinary', 'grooming', 'training', 'boarding', 'telemedicine'],
    required: true,
  },
  dateTime: { type: Date, required: true },
  duration: { type: Number, default: 60 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending',
  },
  notes: { type: String },
  price: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

AppointmentSchema.index({ providerId: 1, status: 1 });
AppointmentSchema.index({ ownerId: 1 });
AppointmentSchema.index({ petId: 1, dateTime: -1 });

export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
