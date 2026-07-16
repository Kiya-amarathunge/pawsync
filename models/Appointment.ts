import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  petId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  serviceType: 'veterinary' | 'grooming' | 'training' | 'boarding';
  dateTime: Date;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  price: number;
  createdAt: Date;
  rescheduleHistory: { previousDateTime: Date; newDateTime: Date; requestedBy: mongoose.Types.ObjectId; changedAt: Date }[];
  reminder24hSent: boolean;
  reminder2hSent: boolean;
  statusUpdatedAt?: Date;
  reviewRequested: boolean;
  isEmergency: boolean;
  refundStatus?: 'not_requested' | 'approved' | 'processed';
  refundAmount?: number;
}

const AppointmentSchema = new Schema<IAppointment>({
  petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: {
    type: String,
    enum: ['veterinary', 'grooming', 'training', 'boarding'],
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
  rescheduleHistory: [{
    previousDateTime: { type: Date, required: true },
    newDateTime: { type: Date, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
  }],
  reminder24hSent: { type: Boolean, default: false },
  reminder2hSent: { type: Boolean, default: false },
  statusUpdatedAt: Date,
  reviewRequested: { type: Boolean, default: false },
  isEmergency: { type: Boolean, default: false },
  refundStatus: { type: String, enum: ['not_requested', 'approved', 'processed'], default: 'not_requested' },
  refundAmount: Number,
});

AppointmentSchema.index({ providerId: 1, status: 1 });
AppointmentSchema.index({ ownerId: 1 });
AppointmentSchema.index({ petId: 1, dateTime: -1 });
AppointmentSchema.index({ providerId: 1, dateTime: 1 });

export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
