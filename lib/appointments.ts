export interface AppointmentInterval {
  // The start time and duration are sufficient to calculate the end time.
  dateTime: Date;
  duration: number;
}

export interface AvailabilityWindow {
  startTime: string;
  endTime: string;
}

export function intervalsOverlap(
  candidateStart: Date,
  candidateDuration: number,
  existing: AppointmentInterval
) {
  // Appointments are treated as half-open intervals: [start, end). Therefore,
  // a 10:00-11:00 appointment does not conflict with one starting at 11:00.
  const candidateEnd = candidateStart.getTime() + candidateDuration * 60_000;
  const existingStart = existing.dateTime.getTime();
  const existingEnd = existingStart + existing.duration * 60_000;
  return candidateStart.getTime() < existingEnd && candidateEnd > existingStart;
}

export function isWithinAvailability(start: Date, duration: number, window: AvailabilityWindow) {
  // Converting clock values to minutes avoids complicated string comparisons
  // and confirms that the full appointment, not only its start, fits the window.
  const [startHour, startMinute] = window.startTime.split(':').map(Number);
  const [endHour, endMinute] = window.endTime.split(':').map(Number);
  const appointmentMinute = start.getHours() * 60 + start.getMinutes();
  return appointmentMinute >= startHour * 60 + startMinute
    && appointmentMinute + duration <= endHour * 60 + endMinute;
}
