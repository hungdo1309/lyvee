import { format } from 'date-fns';

export function isValidTripTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export function formatTripTime(value?: string): string {
  if (!value || !isValidTripTime(value)) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}

export function getTripTimeRangeError(
  startTime?: string,
  endTime?: string,
  options?: { allowEndBeforeStart?: boolean }
): string | null {
  if (startTime && !isValidTripTime(startTime)) return 'Use a valid start time';
  if (endTime && !isValidTripTime(endTime)) return 'Use a valid end time';
  if (
    startTime &&
    endTime &&
    endTime <= startTime &&
    !options?.allowEndBeforeStart
  ) {
    return startTime === endTime
      ? 'Start and end times must be different'
      : 'End time must be after start time';
  }
  return null;
}

export function parseTripTime(value?: string): Date {
  const date = new Date();
  date.setSeconds(0, 0);
  if (!value || !isValidTripTime(value)) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  const [hours, minutes] = value.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatTripTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
