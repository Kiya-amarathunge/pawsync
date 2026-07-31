import { describe, expect, it } from 'vitest';
import { consumeRateLimit } from './rate-limit';

describe('consumeRateLimit', () => {
  it('allows requests up to the configured limit', () => {
    const key = `allowed-${Date.now()}`;
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true);
  });

  it('rejects requests after the configured limit', () => {
    const key = `blocked-${Date.now()}`;
    consumeRateLimit(key, 1, 60_000);
    const result = consumeRateLimit(key, 1, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
