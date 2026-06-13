import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isThisYear,
} from 'date-fns';
import { ItemInstance } from './itemInstances';

export function formatItemDate(dateTime: string | null): string {
  if (!dateTime) return 'No date';
  const date = parseISO(dateTime);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, yyyy · h:mm a');
}

export function formatUpcomingDayHeader(dateKey: string, count: number): string {
  const date = parseISO(dateKey);
  let label: string;
  if (isToday(date)) {
    label = 'Today';
  } else if (isTomorrow(date)) {
    label = 'Tomorrow';
  } else {
    label = format(date, 'EEEE, MMM d');
  }
  const countLabel = count === 1 || count === 0 ? `${count} item` : `${count} items`;
  return `${label} · ${countLabel}`;
}

export function formatOverdueSectionHeader(count: number): string {
  const countLabel = count === 1 ? '1 task' : `${count} tasks`;
  return `Overdue · ${countLabel}`;
}

export function formatUpcomingSectionTitle(dateKey: string): string {
  const date = parseISO(dateKey);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
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

export function formatMemberSince(dateTime: string): string {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return '';
  return `Member since ${format(date, 'MMMM yyyy')}`;
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

/** Default date/time when creating from calendar — selected day with current local time. */
export function getDefaultItemDateTimeForDate(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return getDefaultItemDateTime();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const now = new Date();
  const date = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return getDefaultItemDateTime();
  }

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
