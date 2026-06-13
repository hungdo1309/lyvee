import {
  addDays,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { colors } from '../constants/theme';
import { Trip, TripItineraryEntry } from '../types/trips';
import { getTripEntrySortKey, parseTripDateKey } from './trips';
import { isValidTripTime } from './tripTime';
import { CalendarMarkedDate } from './itemInstances';

export interface TripPlanInstance {
  instanceKey: string;
  tripId: string;
  groupId: string;
  tripDestination: string;
  dateKey: string;
  entry: TripItineraryEntry;
}

const TRIP_MARKED_DOT_COLOR = colors.primaryDark;

export function buildTripPlanInstanceKey(
  tripId: string,
  dateKey: string,
  entryId: string
): string {
  return `trip:${tripId}:${dateKey}:${entryId}`;
}

export function expandTripPlanInstances(trips: Trip[]): TripPlanInstance[] {
  const instances: TripPlanInstance[] = [];

  for (const trip of trips) {
    for (const day of trip.days) {
      for (const entry of day.entries) {
        instances.push({
          instanceKey: buildTripPlanInstanceKey(trip.id, day.date, entry.id),
          tripId: trip.id,
          groupId: trip.groupId,
          tripDestination: trip.destination,
          dateKey: day.date,
          entry,
        });
      }
    }
  }

  return instances;
}

export function buildTripEntryDateTime(dateKey: string, startTime: string): Date {
  const date = parseTripDateKey(dateKey);
  if (isValidTripTime(startTime)) {
    const [hours, minutes] = startTime.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  }
  return date;
}

export function sortTripPlanInstances(instances: TripPlanInstance[]): TripPlanInstance[] {
  return [...instances].sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    const leftKey = getTripEntrySortKey(left.entry);
    const rightKey = getTripEntrySortKey(right.entry);
    if (leftKey && rightKey && leftKey !== rightKey) {
      return leftKey.localeCompare(rightKey);
    }
    if (leftKey && !rightKey) return -1;
    if (!leftKey && rightKey) return 1;
    return left.entry.title.localeCompare(right.entry.title);
  });
}

export function getTripPlanInstancesForDate(
  trips: Trip[],
  date: Date
): TripPlanInstance[] {
  const dateKey = format(date, 'yyyy-MM-dd');
  return sortTripPlanInstances(
    expandTripPlanInstances(trips).filter((instance) => instance.dateKey === dateKey)
  );
}

export function getUpcomingTripPlanInstances(
  trips: Trip[],
  daysAhead: number
): TripPlanInstance[] {
  const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd');
  const lastKey = format(addDays(startOfDay(new Date()), daysAhead - 1), 'yyyy-MM-dd');

  return sortTripPlanInstances(
    expandTripPlanInstances(trips).filter(
      (instance) => instance.dateKey >= todayKey && instance.dateKey <= lastKey
    )
  );
}

export function getMarkedDatesFromTrips(
  trips: Trip[],
  month: Date
): Record<string, CalendarMarkedDate> {
  const rangeStart = startOfMonth(month);
  const rangeEnd = endOfMonth(month);
  const startKey = format(rangeStart, 'yyyy-MM-dd');
  const endKey = format(rangeEnd, 'yyyy-MM-dd');
  const marked: Record<string, CalendarMarkedDate> = {};

  for (const instance of expandTripPlanInstances(trips)) {
    if (instance.dateKey < startKey || instance.dateKey > endKey) continue;

    if (!marked[instance.dateKey]) {
      marked[instance.dateKey] = { marked: true, dots: [], overdue: false };
    }

    if ((marked[instance.dateKey].dots?.length ?? 0) < 3) {
      marked[instance.dateKey].dots!.push({ color: TRIP_MARKED_DOT_COLOR });
    }
  }

  return marked;
}

export function mergeCalendarMarkedDates(
  itemMarked: Record<string, CalendarMarkedDate>,
  tripMarked: Record<string, CalendarMarkedDate>
): Record<string, CalendarMarkedDate> {
  const merged: Record<string, CalendarMarkedDate> = { ...itemMarked };

  for (const [dateKey, tripMarking] of Object.entries(tripMarked)) {
    const existing = merged[dateKey];
    if (!existing) {
      merged[dateKey] = {
        marked: true,
        dots: [...(tripMarking.dots ?? [])],
        overdue: tripMarking.overdue ?? false,
      };
      continue;
    }

    merged[dateKey] = {
      marked: true,
      overdue: existing.overdue || tripMarking.overdue,
      dots: [...(existing.dots ?? []), ...(tripMarking.dots ?? [])].slice(0, 3),
    };
  }

  return merged;
}

export interface HomeUpcomingDaySchedule {
  dateKey: string;
  itemInstances: import('./itemInstances').ItemInstance[];
  tripInstances: TripPlanInstance[];
}

export function buildHomeUpcomingDaySchedule(
  itemInstances: import('./itemInstances').ItemInstance[],
  tripInstances: TripPlanInstance[],
  daysAhead: number
): HomeUpcomingDaySchedule[] {
  const today = startOfDay(new Date());
  const itemGrouped = new Map<string, import('./itemInstances').ItemInstance[]>();
  const tripGrouped = new Map<string, TripPlanInstance[]>();

  for (const instance of itemInstances) {
    if (!instance.occurrenceDate) continue;
    const dateKey = format(parseISO(instance.occurrenceDate), 'yyyy-MM-dd');
    const bucket = itemGrouped.get(dateKey) ?? [];
    bucket.push(instance);
    itemGrouped.set(dateKey, bucket);
  }

  for (const instance of tripInstances) {
    const bucket = tripGrouped.get(instance.dateKey) ?? [];
    bucket.push(instance);
    tripGrouped.set(instance.dateKey, bucket);
  }

  return Array.from({ length: daysAhead }, (_, index) => {
    const dateKey = format(addDays(today, index), 'yyyy-MM-dd');
    return {
      dateKey,
      itemInstances: itemGrouped.get(dateKey) ?? [],
      tripInstances: sortTripPlanInstances(tripGrouped.get(dateKey) ?? []),
    };
  });
}

export function countHomeScheduleEntries(section: HomeUpcomingDaySchedule): number {
  return section.itemInstances.length + section.tripInstances.length;
}
