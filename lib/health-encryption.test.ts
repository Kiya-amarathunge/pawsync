import { beforeAll, describe, expect, it } from 'vitest';
import { decryptHealthPayload, encryptHealthPayload } from './health-encryption';

beforeAll(() => {
  process.env.HEALTH_RECORD_ENCRYPTION_KEY = 'test-only-key-with-sufficient-entropy';
});

describe('health record encryption', () => {
  it('round-trips clinical content without storing plaintext', () => {
    const payload = { diagnosis: 'Dermatitis', treatment: 'Topical care', prescriptions: ['Medicine A'] };
    const encrypted = encryptHealthPayload(payload);
    expect(encrypted.encryptedData).not.toContain(payload.diagnosis);
    expect(decryptHealthPayload(encrypted)).toEqual(payload);
  });

  it('rejects modified ciphertext', () => {
    const encrypted = encryptHealthPayload({ diagnosis: 'Healthy', treatment: '', prescriptions: [] });
    const tampered = { ...encrypted, encryptedData: `${encrypted.encryptedData.slice(0, -2)}AA` };
    expect(() => decryptHealthPayload(tampered)).toThrow();
  });
});
