import mongoose, { Schema, Document } from 'mongoose';

export interface IHealthRecord extends Document {
  petId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  date: Date;
  diagnosis: string;
  treatment: string;
  prescriptions: string[];
  documents: { filename: string; storageKey: string; mimeType: string; uploadedAt: Date }[];
  addedBy: mongoose.Types.ObjectId;
  version: number;
  checksum: string;
  encryptedData?: string;
  encryptionIv?: string;
  encryptionTag?: string;
  versionHistory: {
    version: number;
    encryptedData: string;
    encryptionIv: string;
    encryptionTag: string;
    checksum: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
  }[];
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
    storageKey: { type: String },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],
  addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 1 },
  checksum: { type: String },
  encryptedData: { type: String, select: false },
  encryptionIv: { type: String, select: false },
  encryptionTag: { type: String, select: false },
  versionHistory: [{
    version: { type: Number, required: true },
    encryptedData: { type: String, required: true },
    encryptionIv: { type: String, required: true },
    encryptionTag: { type: String, required: true },
    checksum: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

HealthRecordSchema.index({ petId: 1, date: -1 });
HealthRecordSchema.index({ ownerId: 1 });

export default mongoose.models.HealthRecord || mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);
