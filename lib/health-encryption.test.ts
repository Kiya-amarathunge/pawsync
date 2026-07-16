import { beforeAll, describe, expect, it } from 'vitest';
import { decryptHealthPayload, encryptHealthPayload } from './health-encryption';

beforeAll(() => {
  // Tests use a deterministic, non-production key so they do not depend on the
  // developer's private .env.local configuration.
  process.env.HEALTH_RECORD_ENCRYPTION_KEY = 'test-only-key-with-sufficient-entropy';
});

describe('health record encryption', () => {
  it('round-trips clinical content without storing plaintext', () => {
    // A round trip means encrypting and then decrypting returns the same object.
    const payload = { diagnosis: 'Dermatitis', treatment: 'Topical care', prescriptions: ['Medicine A'] };
    const encrypted = encryptHealthPayload(payload);
    // Sensitive clinical text must not be visible in the stored ciphertext.
    expect(encrypted.encryptedData).not.toContain(payload.diagnosis);
    expect(decryptHealthPayload(encrypted)).toEqual(payload);
  });

  it('rejects modified ciphertext', () => {
    // AES-GCM authenticates the encrypted data, so changing even a small part
    // must make decryption fail instead of returning corrupted health data.
    const encrypted = encryptHealthPayload({ diagnosis: 'Healthy', treatment: '', prescriptions: [] });
    const tampered = { ...encrypted, encryptedData: `${encrypted.encryptedData.slice(0, -2)}AA` };
    expect(() => decryptHealthPayload(tampered)).toThrow();
  });
});
