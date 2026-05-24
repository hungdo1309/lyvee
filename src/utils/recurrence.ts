import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  format,
  isBefore,
  startOfDay,
} from 'date-fns';
import { RecurringRule } from '../types';

const MAX_ITERATIONS = 500;

export function formatRecurringLabel(rule: RecurringRule): string {
  switch (rule.frequency) {
    case 'none':
      return 'Does not repeat';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    case 'custom':
      return `Every ${rule.interval ?? 1} ${rule.unit ?? 'days'}`;
    default:
      return '';
  }
}

export function advanceDate(date: Date, rule: RecurringRule): Date {
  switch (rule.frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    case 'custom': {
      const interval = rule.interval ?? 1;
      switch (rule.unit) {
        case 'weeks':
          return addWeeks(date, interval);
        case 'months':
          return addMonths(date, interval);
        case 'years':
          return addYears(date, interval);
        default:
          return addDays(date, interval);
      }
    }
    default:
      return date;
  }
}

export function toOccurrenceKey(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/** Next occurrence strictly after `after` (or from base if none). */
export function getNextOccurrence(
  dateTime: string,
  rule: RecurringRule,
  after: Date = new Date()
): Date | null {
  const base = parseISO(dateTime);
  if (rule.frequency === 'none') {
    return isBefore(base, after) ? null : base;
  }

  let current = base;
  let iterations = 0;

  while (isBefore(current, after) && iterations < MAX_ITERATIONS) {
    current = advanceDate(current, rule);
    iterations++;
  }

  return iterations >= MAX_ITERATIONS ? null : current;
}

/** All occurrence datetimes within [rangeStart, rangeEnd] inclusive. */
export function getOccurrencesInRange(
  dateTime: string,
  rule: RecurringRule,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const base = parseISO(dateTime);

  if (rule.frequency === 'none') {
    return base >= rangeStart && base <= rangeEnd ? [base] : [];
  }

  const occurrences: Date[] = [];
  let current = base;
  let iterations = 0;

  while (current < rangeStart && iterations < MAX_ITERATIONS) {
    current = advanceDate(current, rule);
    iterations++;
  }

  while (current <= rangeEnd && iterations < MAX_ITERATIONS) {
    if (current >= rangeStart) {
      occurrences.push(new Date(current));
    }
    current = advanceDate(current, rule);
    iterations++;
  }

  return occurrences;
}

/** Upcoming occurrences from now, capped at `limit`. */
export function getUpcomingOccurrences(
  dateTime: string,
  rule: RecurringRule,
  limit: number,
  from: Date = new Date()
): Date[] {
  if (rule.frequency === 'none') {
    const base = parseISO(dateTime);
    return isBefore(base, from) ? [] : [base];
  }

  const horizon = addYears(from, 2);
  const inRange = getOccurrencesInRange(dateTime, rule, from, horizon);
  return inRange.slice(0, limit);
}

export function mergeOccurrenceDateTime(baseIso: string, occurrence: Date): string {
  const base = parseISO(baseIso);
  const merged = new Date(occurrence);
  merged.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
  return merged.toISOString();
}

export function isPastOccurrence(occurrenceIso: string): boolean {
  return isBefore(parseISO(occurrenceIso), startOfDay(new Date()));
}
