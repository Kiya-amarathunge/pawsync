export interface AppointmentInterval {
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
  // Half-open intervals allow one appointment to begin exactly when another ends.
  const candidateEnd = candidateStart.getTime() + candidateDuration * 60_000;
  const existingStart = existing.dateTime.getTime();
  const existingEnd = existingStart + existing.duration * 60_000;
  return candidateStart.getTime() < existingEnd && candidateEnd > existingStart;
}

export function isWithinAvailability(start: Date, duration: number, window: AvailabilityWindow) {
  // Converting both times to minutes makes the boundary comparison date-independent.
  const [startHour, startMinute] = window.startTime.split(':').map(Number);
  const [endHour, endMinute] = window.endTime.split(':').map(Number);
  const appointmentMinute = start.getHours() * 60 + start.getMinutes();
  return appointmentMinute >= startHour * 60 + startMinute
    && appointmentMinute + duration <= endHour * 60 + endMinute;
}
