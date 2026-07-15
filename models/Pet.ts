import mongoose, { Schema, Document } from 'mongoose';

export interface IPet extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  species: string;
  breed: string;
  birthDate: Date;
  weight: number;
  weightHistory: { weight: number; date: Date }[];
  microchipNumber: string;
  photos: string[];
  dietaryInfo: string;
  dietHistory: { description: string; date: Date; observedEffect?: string }[];
  medicationSchedules: {
    medication: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    nextReminderAt?: Date;
    lastReminderSentAt?: Date;
  }[];
  documents: { filename: string; storageKey: string; mimeType: string; uploadedAt: Date }[];
  sharedWith: { veterinarianId: mongoose.Types.ObjectId; grantedAt: Date }[];
  vaccinationHistory: {
    vaccine: string;
    date: Date;
    nextDueDate: Date;
    reminderSent: boolean;
  }[];
  medicalEvents: {
    type: string;
    date: Date;
    notes: string;
    vetId: mongoose.Types.ObjectId;
  }[];
  createdAt: Date;
}

const PetSchema = new Schema<IPet>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  species: { type: String, required: true, trim: true },
  breed: { type: String, trim: true },
  birthDate: { type: Date },
  weight: { type: Number },
  weightHistory: [{ weight: { type: Number, required: true }, date: { type: Date, default: Date.now } }],
  microchipNumber: { type: String, trim: true },
  photos: [{ type: String }],
  dietaryInfo: { type: String },
  dietHistory: [{
    description: { type: String, required: true },
    date: { type: Date, default: Date.now },
    observedEffect: String,
  }],
  medicationSchedules: [{
    medication: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    nextReminderAt: Date,
    lastReminderSentAt: Date,
  }],
  documents: [{
    filename: { type: String, required: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  sharedWith: [{
    veterinarianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grantedAt: { type: Date, default: Date.now },
  }],
  vaccinationHistory: [{
    vaccine: { type: String, required: true },
    date: { type: Date, required: true },
    nextDueDate: { type: Date },
    reminderSent: { type: Boolean, default: false },
  }],
  medicalEvents: [{
    type: { type: String },
    date: { type: Date },
    notes: { type: String },
    vetId: { type: Schema.Types.ObjectId, ref: 'User' },
  }],
  createdAt: { type: Date, default: Date.now },
});

PetSchema.index({ ownerId: 1 });

export default mongoose.models.Pet || mongoose.model<IPet>('Pet', PetSchema);
