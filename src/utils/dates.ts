import {
  format,
  parseISO,
  isToday,
  isThisYear,
} from 'date-fns';
import { ItemInstance } from './itemInstances';

export function formatItemDate(dateTime: string | null): string {
  if (!dateTime) return 'No date';
  const date = parseISO(dateTime);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, yyyy · h:mm a');
}

export function formatItemDateShort(dateTime: string | null): string {
  if (!dateTime) return '';
  const date = parseISO(dateTime);
  const time = format(date, 'h:mm a');

  if (isToday(date)) {
    return `Today · ${time}`;
  }

  const datePart = isThisYear(date)
    ? format(date, 'MMM d')
    : format(date, 'MMM d, yyyy');

  return `${datePart} · ${time}`;
}

export function formatInstanceDate(instance: ItemInstance): string {
  if (!instance.occurrenceDate) return 'No date';
  const formatted = formatItemDate(instance.occurrenceDate);
  if (instance.isRecurring) return `${formatted} · Repeats`;
  return formatted;
}

export function toISODateTime(date: Date): string {
  return date.toISOString();
}

/** Default date/time for new items — today with current local time (seconds cleared). */
export function getDefaultItemDateTime(): Date {
  const date = new Date();
  date.setSeconds(0, 0);
  return date;
}

export function parseDateTimeInput(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Re-export instance helpers for calendar
export {
  getInstancesForDate,
  getUpcomingInstances,
  getMarkedDatesFromItems,
  expandItems,
  getNextInstance,
  isCalendarInstanceActive,
} from './itemInstances';

export { formatRecurringLabel, getUpcomingOccurrences } from './recurrence';
