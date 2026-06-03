import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthRecord extends Document {
  petId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  date: Date;
  diagnosis: string;
  treatment: string;
  prescriptions: string[];
  documents: { filename: string; url: string; uploadedAt: Date }[];
  addedBy: mongoose.Types.ObjectId;
  version: number;
  checksum: string;
  createdAt: Date;
}

const HealthRecordSchema = new Schema<IHealthRecord>({
  petId: { type: Schema.Types.ObjectId, ref: 'Pet', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },
  diagnosis: { type: String },
  treatment: { type: String },
  prescriptions: [{ type: String }],
  documents: [{
    filename: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],
  addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
  checksum: { type: String },
  createdAt: { type: Date, default: Date.now },
});

HealthRecordSchema.index({ petId: 1, date: -1 });
HealthRecordSchema.index({ ownerId: 1 });

export default mongoose.models.HealthRecord || mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);
