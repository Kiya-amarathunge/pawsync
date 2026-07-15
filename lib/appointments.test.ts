import { describe, expect, it } from 'vitest';
import { intervalsOverlap, isWithinAvailability } from './appointments';

describe('appointment scheduling', () => {
  const existing = { dateTime: new Date('2026-07-12T10:00:00'), duration: 60 };

  it('detects partial and contained overlaps', () => {
    expect(intervalsOverlap(new Date('2026-07-12T09:30:00'), 60, existing)).toBe(true);
    expect(intervalsOverlap(new Date('2026-07-12T10:15:00'), 30, existing)).toBe(true);
  });

  it('allows appointments that touch but do not overlap', () => {
    expect(intervalsOverlap(new Date('2026-07-12T09:00:00'), 60, existing)).toBe(false);
    expect(intervalsOverlap(new Date('2026-07-12T11:00:00'), 60, existing)).toBe(false);
  });

  it('enforces the complete appointment inside working hours', () => {
    const hours = { startTime: '09:00', endTime: '17:00' };
    expect(isWithinAvailability(new Date('2026-07-12T09:00:00'), 60, hours)).toBe(true);
    expect(isWithinAvailability(new Date('2026-07-12T16:30:00'), 60, hours)).toBe(false);
  });
});
