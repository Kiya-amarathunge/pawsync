import { describe, expect, it } from 'vitest';
import { intervalsOverlap, isWithinAvailability } from './appointments';

describe('appointment scheduling', () => {
  // This fixed appointment is the baseline used by all overlap examples.
  const existing = { dateTime: new Date('2026-07-12T10:00:00'), duration: 60 };

  it('detects partial and contained overlaps', () => {
    // Both candidates occupy some of the existing 10:00-11:00 period.
    expect(intervalsOverlap(new Date('2026-07-12T09:30:00'), 60, existing)).toBe(true);
    expect(intervalsOverlap(new Date('2026-07-12T10:15:00'), 30, existing)).toBe(true);
  });

  it('allows appointments that touch but do not overlap', () => {
    // Boundary-touching appointments are valid because no minute is shared.
    expect(intervalsOverlap(new Date('2026-07-12T09:00:00'), 60, existing)).toBe(false);
    expect(intervalsOverlap(new Date('2026-07-12T11:00:00'), 60, existing)).toBe(false);
  });

  it('enforces the complete appointment inside working hours', () => {
    // Starting before closing is insufficient if the appointment ends afterward.
    const hours = { startTime: '09:00', endTime: '17:00' };
    expect(isWithinAvailability(new Date('2026-07-12T09:00:00'), 60, hours)).toBe(true);
    expect(isWithinAvailability(new Date('2026-07-12T16:30:00'), 60, hours)).toBe(false);
  });
});
