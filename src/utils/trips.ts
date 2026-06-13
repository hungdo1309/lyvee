import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  DEFAULT_TRIP_ENTRY_TAG,
  Trip,
  TripDayPlan,
  TripDayStay,
  TripItineraryEntry,
} from '../types/trips';
import { TripLocation, tripLocationLabel } from '../types/places';
import { isAutoFlightEntryId } from './tripFlightIds';
import { formatTagLabel, getTagStyle, normalizeTag } from './tags';
import { formatTripTime } from './tripTime';

export { formatTripTime, getTripTimeRangeError, isValidTripTime } from './tripTime';

export const MAX_TRIP_DAYS = 60;
export const MAX_DESTINATION_LENGTH = 120;
export const MAX_ENTRY_TITLE_LENGTH = 120;
export const MAX_ENTRY_NOTES_LENGTH = 500;
export const MAX_ENTRY_LOCATION_LENGTH = 120;
export const MAX_STAY_TITLE_LENGTH = 120;

/** @deprecated use MAX_ENTRY_LOCATION_LENGTH */
export const MAX_ENTRY_PLACE_LENGTH = MAX_ENTRY_LOCATION_LENGTH;

export function normalizeTripTag(raw: string): string {
  return normalizeTag(raw) ?? DEFAULT_TRIP_ENTRY_TAG;
}

export function parseTripDateKey(value: string): Date {
  return parseISO(value);
}

export function formatTripDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTripDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (startDate === endDate) {
    return format(start, 'MMM d, yyyy');
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

export function countTripDays(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
}

export function countTripEntries(trip: Trip): number {
  return trip.days.reduce((total, day) => total + day.entries.length, 0);
}

export function buildTripDayPlans(startDate: string, endDate: string): TripDayPlan[] {
  const dayCount = countTripDays(startDate, endDate);
  if (dayCount < 1 || dayCount > MAX_TRIP_DAYS) {
    throw new Error(`Trips can be up to ${MAX_TRIP_DAYS} days long`);
  }

  const start = parseISO(startDate);
  return Array.from({ length: dayCount }, (_, index) => ({
    date: formatTripDateKey(addDays(start, index)),
    entries: [],
  }));
}

export function expandTripDaysToCoverRange(
  days: TripDayPlan[],
  tripStartDate: string,
  tripEndDate: string,
  requiredStartDate: string,
  requiredEndDate: string
): { days: TripDayPlan[]; startDate: string; endDate: string } {
  const nextStartDate =
    requiredStartDate < tripStartDate ? requiredStartDate : tripStartDate;
  const nextEndDate = requiredEndDate > tripEndDate ? requiredEndDate : tripEndDate;
  const rangeError = getTripDateRangeError(nextStartDate, nextEndDate);
  if (rangeError) {
    throw new Error(rangeError);
  }

  if (nextStartDate === tripStartDate && nextEndDate === tripEndDate) {
    return { days, startDate: tripStartDate, endDate: tripEndDate };
  }

  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const start = parseISO(nextStartDate);
  const dayCount = countTripDays(nextStartDate, nextEndDate);
  const nextDays = Array.from({ length: dayCount }, (_, index) => {
    const date = formatTripDateKey(addDays(start, index));
    return dayByDate.get(date) ?? { date, entries: [] };
  });

  return { days: nextDays, startDate: nextStartDate, endDate: nextEndDate };
}

export function minDateKey(left: string, right: string): string {
  return left < right ? left : right;
}

export function maxDateKey(left: string, right: string): string {
  return left > right ? left : right;
}

/** Expands trip day plans when content falls outside the current trip range. Never shrinks. */
export function expandTripDaysForOutsideRange(
  days: TripDayPlan[],
  tripStartDate: string,
  tripEndDate: string,
  requiredStartDate: string,
  requiredEndDate: string
): { days: TripDayPlan[]; startDate: string; endDate: string } {
  const nextStartDate = minDateKey(requiredStartDate, tripStartDate);
  const nextEndDate = maxDateKey(requiredEndDate, tripEndDate);

  if (nextStartDate === tripStartDate && nextEndDate === tripEndDate) {
    return { days, startDate: tripStartDate, endDate: tripEndDate };
  }

  return expandTripDaysToCoverRange(
    days,
    tripStartDate,
    tripEndDate,
    nextStartDate,
    nextEndDate
  );
}

export function createTripEntryId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatTripTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime && !endTime) return '';
  if (startTime && endTime) {
    return `${formatTripTime(startTime)} – ${formatTripTime(endTime)}`;
  }
  if (startTime) return `From ${formatTripTime(startTime)}`;
  return `Until ${formatTripTime(endTime)}`;
}

export function formatTripEntryTimeLabel(entry: TripItineraryEntry): string {
  if (isAutoStayEntry(entry) || isAutoFlightEntryId(entry.id)) {
    if (!entry.startTime) return '';
    return `At ${formatTripTime(entry.startTime)}`;
  }
  return formatTripTimeRange(entry.startTime, entry.endTime);
}

type EntryTimeShape =
  | { kind: 'range'; startMin: number; endMin: number }
  | { kind: 'start'; startMin: number }
  | { kind: 'end'; endMin: number }
  | { kind: 'point'; atMin: number };

function isAutoStayEntry(entry: TripItineraryEntry): boolean {
  return (
    entry.id.startsWith('stay_') &&
    (entry.id.endsWith('_checkin') || entry.id.endsWith('_checkout'))
  );
}

function tripTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function getEntryTimeShape(entry: TripItineraryEntry): EntryTimeShape | null {
  const { startTime, endTime } = entry;
  if (!startTime && !endTime) return null;

  if ((isAutoStayEntry(entry) || isAutoFlightEntryId(entry.id)) && startTime) {
    return { kind: 'point', atMin: tripTimeToMinutes(startTime) };
  }

  if (startTime && endTime) {
    const startMin = tripTimeToMinutes(startTime);
    const endMin = tripTimeToMinutes(endTime);
    if (endMin <= startMin) return null;
    return { kind: 'range', startMin, endMin };
  }

  if (startTime) {
    return { kind: 'start', startMin: tripTimeToMinutes(startTime) };
  }

  return { kind: 'end', endMin: tripTimeToMinutes(endTime!) };
}

function minuteInRange(minute: number, startMin: number, endMin: number): boolean {
  return minute >= startMin && minute < endMin;
}

function rangesOverlap(left: EntryTimeShape & { kind: 'range' }, right: EntryTimeShape & { kind: 'range' }): boolean {
  return left.startMin < right.endMin && right.startMin < left.endMin;
}

function entryTimeShapesOverlap(left: EntryTimeShape, right: EntryTimeShape): boolean {
  if (left.kind === 'range' && right.kind === 'range') {
    return rangesOverlap(left, right);
  }

  if (left.kind === 'point' && right.kind === 'point') {
    return left.atMin === right.atMin;
  }

  if (left.kind === 'start' && right.kind === 'start') {
    return left.startMin === right.startMin;
  }

  if (left.kind === 'end' && right.kind === 'end') {
    return left.endMin === right.endMin;
  }

  if (left.kind === 'start' && right.kind === 'end') {
    return left.startMin === right.endMin;
  }

  if (left.kind === 'end' && right.kind === 'start') {
    return right.startMin === left.endMin;
  }

  if (left.kind === 'range' && right.kind === 'point') {
    return minuteInRange(right.atMin, left.startMin, left.endMin);
  }

  if (left.kind === 'point' && right.kind === 'range') {
    return minuteInRange(left.atMin, right.startMin, right.endMin);
  }

  if (left.kind === 'range' && right.kind === 'start') {
    return minuteInRange(right.startMin, left.startMin, left.endMin);
  }

  if (left.kind === 'start' && right.kind === 'range') {
    return minuteInRange(left.startMin, right.startMin, right.endMin);
  }

  if (left.kind === 'range' && right.kind === 'end') {
    return right.endMin > left.startMin && right.endMin <= left.endMin;
  }

  if (left.kind === 'end' && right.kind === 'range') {
    return left.endMin > right.startMin && left.endMin <= right.endMin;
  }

  if (left.kind === 'point' && right.kind === 'start') {
    return left.atMin === right.startMin;
  }

  if (left.kind === 'start' && right.kind === 'point') {
    return left.startMin === right.atMin;
  }

  if (left.kind === 'point' && right.kind === 'end') {
    return left.atMin === right.endMin;
  }

  if (left.kind === 'end' && right.kind === 'point') {
    return right.atMin === left.endMin;
  }

  return false;
}

export function entryTimeBlocksOverlap(
  left: TripItineraryEntry,
  right: TripItineraryEntry
): boolean {
  const leftShape = getEntryTimeShape(left);
  const rightShape = getEntryTimeShape(right);
  if (!leftShape || !rightShape) return false;
  return entryTimeShapesOverlap(leftShape, rightShape);
}

export function getOverlappingEntryIds(entries: TripItineraryEntry[]): Set<string> {
  const overlapping = new Set<string>();

  for (let index = 0; index < entries.length; index++) {
    for (let other = index + 1; other < entries.length; other++) {
      if (!entryTimeBlocksOverlap(entries[index], entries[other])) continue;
      overlapping.add(entries[index].id);
      overlapping.add(entries[other].id);
    }
  }

  return overlapping;
}

/** Timed entries that appear before later-timed items after a manual reorder. */
export function getOutOfOrderEntryIds(entries: TripItineraryEntry[]): Set<string> {
  const outOfOrder = new Set<string>();

  for (let left = 0; left < entries.length; left++) {
    const leftKey = getTripEntrySortKey(entries[left]);
    if (!leftKey) continue;

    for (let right = left + 1; right < entries.length; right++) {
      const rightKey = getTripEntrySortKey(entries[right]);
      if (!rightKey) continue;
      if (leftKey > rightKey) {
        outOfOrder.add(entries[left].id);
        outOfOrder.add(entries[right].id);
      }
    }
  }

  return outOfOrder;
}

export function getTripEntrySortKey(entry: TripItineraryEntry): string | null {
  return entry.startTime ?? entry.endTime ?? null;
}

export function sortTripEntries(entries: TripItineraryEntry[]): TripItineraryEntry[] {
  return [...entries].sort((left, right) => {
    const leftKey = getTripEntrySortKey(left);
    const rightKey = getTripEntrySortKey(right);
    if (leftKey && rightKey && leftKey !== rightKey) {
      return leftKey.localeCompare(rightKey);
    }
    if (leftKey && !rightKey) return -1;
    if (!leftKey && rightKey) return 1;
    return left.title.localeCompare(right.title);
  });
}

export function clampTripDateKey(dateKey: string, startDate: string, endDate: string): string {
  if (dateKey < startDate) return startDate;
  if (dateKey > endDate) return endDate;
  return dateKey;
}

export function insertTripEntryInOrder(
  entries: TripItineraryEntry[],
  entry: TripItineraryEntry,
  replaceIndex?: number
): TripItineraryEntry[] {
  const remaining =
    replaceIndex !== undefined && replaceIndex >= 0
      ? entries.filter((_, index) => index !== replaceIndex)
      : entries.filter((item) => item.id !== entry.id);

  const sortKey = getTripEntrySortKey(entry);
  if (!sortKey) {
    return [...remaining, entry];
  }

  let insertAt = remaining.length;
  for (let index = 0; index < remaining.length; index++) {
    const existingKey = getTripEntrySortKey(remaining[index]);
    if (!existingKey) {
      insertAt = index;
      break;
    }
    if (sortKey.localeCompare(existingKey) < 0) {
      insertAt = index;
      break;
    }
  }

  const next = [...remaining];
  next.splice(insertAt, 0, entry);
  return next;
}

function entryTimesChanged(before: TripItineraryEntry, after: TripItineraryEntry): boolean {
  return before.startTime !== after.startTime || before.endTime !== after.endTime;
}

export function mergeTripEntryUpdate(
  entries: TripItineraryEntry[],
  entry: TripItineraryEntry
): TripItineraryEntry[] {
  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  if (existingIndex < 0) {
    return insertTripEntryInOrder(entries, entry);
  }

  const existing = entries[existingIndex];
  if (entryTimesChanged(existing, entry)) {
    return insertTripEntryInOrder(entries, entry, existingIndex);
  }

  return entries.map((item, index) => (index === existingIndex ? entry : item));
}

export function normalizeDestination(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidDestination(value: string): boolean {
  const normalized = normalizeDestination(value);
  return normalized.length >= 2 && normalized.length <= MAX_DESTINATION_LENGTH;
}

export function isValidTripDateRange(startDate: string, endDate: string): boolean {
  return getTripDateRangeError(startDate, endDate) === null;
}

export function getTripDateRangeError(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return 'Pick start and end dates';
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Pick valid travel dates';
  }
  if (end < start) return 'To date must be on or after the start date';
  if (countTripDays(startDate, endDate) > MAX_TRIP_DAYS) {
    return `Trips can be up to ${MAX_TRIP_DAYS} days long`;
  }
  return null;
}

export function formatTripDayHeading(dateKey: string, dayNumber: number): string {
  const date = parseISO(dateKey);
  return `Day ${dayNumber} · ${format(date, 'EEE, MMM d')}`;
}

const TRIP_ENTRY_TAG_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  lodging: { backgroundColor: '#FFF7ED', color: '#D97706' },
  flight: { backgroundColor: '#DBEAFE', color: '#2563EB' },
};

export function getTripEntryTagStyle(tag?: string): { backgroundColor: string; color: string } {
  const normalized = tag ? normalizeTag(tag) : null;
  if (normalized && TRIP_ENTRY_TAG_STYLES[normalized]) {
    return TRIP_ENTRY_TAG_STYLES[normalized];
  }
  return getTagStyle(tag ?? DEFAULT_TRIP_ENTRY_TAG);
}

export function getTripEntryTagIcon(tag?: string): string {
  const normalized = tag ? normalizeTag(tag) : null;
  switch (normalized) {
    case 'activity':
    case 'sightseeing':
      return 'compass-outline';
    case 'food':
      return 'restaurant-outline';
    case 'transport':
      return 'car-outline';
    case 'flight':
      return 'airplane-outline';
    case 'lodging':
      return 'bed-outline';
    case 'note':
      return 'document-text-outline';
    default:
      return 'ellipse-outline';
  }
}

export function formatTripEntryTagLabel(tag: string): string {
  return formatTagLabel(normalizeTripTag(tag));
}

export function getStayDisplayLabel(stay: TripDayStay): string {
  return stay.location?.label ?? stay.title;
}

export function formatTripDaySummary(day: TripDayPlan): string {
  const parts: string[] = [];
  if (day.city?.label) parts.push(day.city.label);
  if (day.stay) parts.push(getStayDisplayLabel(day.stay));
  return parts.join(' · ');
}

export function formatTripStayTimes(stay: TripDayStay): string {
  const parts: string[] = [];
  if (stay.checkInTime) parts.push(`Check in ${formatTripTime(stay.checkInTime)}`);
  if (stay.checkOutTime) parts.push(`Check out ${formatTripTime(stay.checkOutTime)}`);
  return parts.join(' · ');
}

export function formatTripEntryLocation(entry: TripItineraryEntry): string {
  return tripLocationLabel(entry.location);
}

export function getPreviousDayPlan(trip: Trip, dateKey: string): TripDayPlan | null {
  const index = trip.days.findIndex((day) => day.date === dateKey);
  if (index <= 0) return null;
  return trip.days[index - 1] ?? null;
}

export function applyCityToFollowingDays(
  days: TripDayPlan[],
  fromDateKey: string,
  city: TripLocation
): TripDayPlan[] {
  let applying = false;
  return days.map((day) => {
    if (day.date === fromDateKey) applying = true;
    if (!applying) return day;
    return { ...day, city };
  });
}

export function applyStayToFollowingDays(
  days: TripDayPlan[],
  fromDateKey: string,
  stay: TripDayStay
): TripDayPlan[] {
  let applying = false;
  return days.map((day) => {
    if (day.date === fromDateKey) applying = true;
    if (!applying) return day;
    return { ...day, stay };
  });
}
