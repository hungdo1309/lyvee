import { addMonths, eachDayOfInterval, format, parseISO, startOfMonth } from 'date-fns';
import { MarkedDates } from 'react-native-calendars/src/types';

export interface CalendarDateRangeSelection {
  startDateKey: string;
  endDateKey: string | null;
}

/** Airline-style range tap: first tap sets start, second sets end (swaps if needed). */
export function applyCalendarDateRangeTap(
  current: CalendarDateRangeSelection,
  dateKey: string
): CalendarDateRangeSelection {
  const { startDateKey, endDateKey } = current;

  if (!startDateKey || endDateKey) {
    return { startDateKey: dateKey, endDateKey: null };
  }

  if (dateKey < startDateKey) {
    return { startDateKey: dateKey, endDateKey: startDateKey };
  }

  return { startDateKey, endDateKey: dateKey };
}

export function normalizeCalendarDateRange(
  selection: CalendarDateRangeSelection
): { startDateKey: string; endDateKey: string } | null {
  if (!selection.startDateKey) return null;
  return {
    startDateKey: selection.startDateKey,
    endDateKey: selection.endDateKey ?? selection.startDateKey,
  };
}

export function buildCalendarPeriodMarkedDates(
  startDateKey: string | null,
  endDateKey: string | null,
  color: string,
  textColor: string
): MarkedDates {
  if (!startDateKey) return {};

  const resolvedEnd = endDateKey ?? startDateKey;
  const start = parseISO(startDateKey);
  const end = parseISO(resolvedEnd);
  const [rangeStart, rangeEnd] = start <= end ? [start, end] : [end, start];
  const startKey = format(rangeStart, 'yyyy-MM-dd');
  const endKey = format(rangeEnd, 'yyyy-MM-dd');

  const marked: MarkedDates = {};

  for (const day of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
    const key = format(day, 'yyyy-MM-dd');
    marked[key] = {
      color,
      textColor,
      startingDay: key === startKey,
      endingDay: key === endKey,
    };
  }

  return marked;
}

export function calendarMonthForRangeSelection(
  startDateKey: string | null,
  endDateKey: string | null
): string | null {
  const anchor = endDateKey ?? startDateKey;
  if (!anchor) return null;
  return format(startOfMonth(parseISO(anchor)), 'yyyy-MM-dd');
}

export function clampDateKeyToBounds(
  dateKey: string,
  minDate?: string,
  maxDate?: string
): string {
  let next = dateKey;
  if (minDate && next < minDate) next = minDate;
  if (maxDate && next > maxDate) next = maxDate;
  return next;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  return format(startOfMonth(addMonths(parseISO(monthKey), deltaMonths)), 'yyyy-MM-dd');
}
