import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  actionType: string;
  affectedEntity: string;
  entityId: mongoose.Types.ObjectId;
  justification: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: { type: String, required: true },
  affectedEntity: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  justification: { type: String },
  timestamp: { type: Date, default: Date.now },
});

AuditLogSchema.index({ adminId: 1 });
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
