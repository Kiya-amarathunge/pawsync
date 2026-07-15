import crypto from 'crypto';

export interface HealthPayload {
  diagnosis: string;
  treatment: string;
  prescriptions: string[];
  medicationSchedule?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export interface EncryptedPayload {
  encryptedData: string;
  encryptionIv: string;
  encryptionTag: string;
  checksum: string;
}

function getKey() {
  const source = process.env.HEALTH_RECORD_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('HEALTH_RECORD_ENCRYPTION_KEY is not configured');
  // SHA-256 normalizes an environment secret of any length into an AES-256 key.
  return crypto.createHash('sha256').update(source).digest();
}

export function encryptHealthPayload(payload: HealthPayload): EncryptedPayload {
  const serialized = JSON.stringify(payload);
  // AES-GCM needs a unique IV per record and also authenticates against tampering.
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
  return {
    encryptedData: encrypted.toString('base64'),
    encryptionIv: iv.toString('base64'),
    encryptionTag: cipher.getAuthTag().toString('base64'),
    checksum: crypto.createHash('sha256').update(serialized).digest('hex'),
  };
}

export function decryptHealthPayload(record: {
  encryptedData?: string;
  encryptionIv?: string;
  encryptionTag?: string;
  diagnosis?: string;
  treatment?: string;
  prescriptions?: string[];
}): HealthPayload {
  // Older plaintext records remain readable while new records use encrypted fields.
  if (!record.encryptedData || !record.encryptionIv || !record.encryptionTag) {
    return {
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      prescriptions: record.prescriptions || [],
    };
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(record.encryptionIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(record.encryptionTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedData, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(decrypted) as HealthPayload;
}
