import mongoose, { Schema, Document } from 'mongoose';

export interface IPet extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  species: string;
  breed: string;
  birthDate: Date;
  weight: number;
  microchipNumber: string;
  photos: string[];
  dietaryInfo: string;
  vaccinationHistory: {
    vaccine: string;
    date: Date;
    nextDueDate: Date;
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
  microchipNumber: { type: String, trim: true },
  photos: [{ type: String }],
  dietaryInfo: { type: String },
  vaccinationHistory: [{
    vaccine: { type: String, required: true },
    date: { type: Date, required: true },
    nextDueDate: { type: Date },
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
