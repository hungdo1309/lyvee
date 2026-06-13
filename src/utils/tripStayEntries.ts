import { getAirportCityFromTripLocation, TripLocation } from '../types/places';
import { TripDayPlan, TripDayStay, TripItineraryEntry } from '../types/trips';
import { getStayDisplayLabel, expandTripDaysToCoverRange, sortTripEntries } from './trips';
import {
  parseAutoFlightEntryId,
} from './tripFlightEntries';

export interface TripStayBlockRecord {
  blockKey: string;
  startDateKey: string;
  endDateKey: string;
  city?: TripLocation;
  stay?: TripDayStay;
}

export interface TripDayDisplayContext {
  cityLabel?: string;
  stayLabel?: string;
}

export function stayCheckInEntryId(stayDateKey: string): string {
  return `stay_${stayDateKey}_checkin`;
}

export function stayCheckOutEntryId(stayDateKey: string): string {
  return `stay_${stayDateKey}_checkout`;
}

export function isAutoStayEntryId(id: string): boolean {
  return id.startsWith('stay_') && (id.endsWith('_checkin') || id.endsWith('_checkout'));
}

export function parseAutoStayEntryId(
  id: string
): { stayDateKey: string; kind: 'checkin' | 'checkout' } | null {
  const match = id.match(/^stay_(.+)_(checkin|checkout)$/);
  if (!match) return null;
  return { stayDateKey: match[1], kind: match[2] as 'checkin' | 'checkout' };
}

function getStayBlockIndices(
  days: TripDayPlan[],
  parsed: { stayDateKey: string; kind: 'checkin' | 'checkout' }
): { startIndex: number; endIndex: number } | null {
  const anchorIndex = days.findIndex((day) => day.date === parsed.stayDateKey);
  if (anchorIndex < 0) return null;

  const anchorStay = days[anchorIndex].stay;
  if (!anchorStay) return null;

  let startIndex = anchorIndex;
  let endIndex = anchorIndex;

  if (parsed.kind === 'checkin') {
    while (
      endIndex + 1 < days.length &&
      days[endIndex + 1].stay &&
      isSameStay(anchorStay, days[endIndex + 1].stay!)
    ) {
      endIndex++;
    }
  } else {
    while (
      startIndex > 0 &&
      days[startIndex - 1].stay &&
      isSameStay(days[startIndex - 1].stay!, anchorStay)
    ) {
      startIndex--;
    }
  }

  return { startIndex, endIndex };
}

export function buildAutoStayEntryTitle(
  kind: 'checkin' | 'checkout',
  location?: TripLocation
): string {
  const placeLabel = location?.label?.trim();
  const prefix = kind === 'checkin' ? 'Check in' : 'Check out';
  return placeLabel ? `${prefix} · ${placeLabel}` : prefix;
}

function hasStayLocation(stay?: TripDayStay): boolean {
  return Boolean(stay?.location?.label?.trim() || stay?.title?.trim());
}

/** Syncs check-in / check-out plan item edits back onto the linked stay block. */
export function applyAutoStayEntryUpdate(
  days: TripDayPlan[],
  entry: TripItineraryEntry,
  entryDateKey: string
): TripDayPlan[] | null {
  const parsed = parseAutoStayEntryId(entry.id);
  if (!parsed) return null;

  const block = getStayBlockIndices(days, parsed);
  if (!block) return null;

  const startDateKey = days[block.startIndex].date;
  const endDateKey = days[block.endIndex].date;
  const anchorStay = days[block.startIndex].stay;
  if (!anchorStay) return null;

  const updatedStay: TripDayStay = { ...anchorStay };
  if (parsed.kind === 'checkin') {
    updatedStay.checkInTime = entry.startTime;
  } else {
    updatedStay.checkOutTime = entry.startTime;
  }
  if (entry.location?.label.trim()) {
    updatedStay.location = entry.location;
    updatedStay.title = entry.location.label.trim();
  }

  let newStart = startDateKey;
  let newEnd = endDateKey;
  if (parsed.kind === 'checkin') {
    newStart = entryDateKey;
    if (newStart > newEnd) newEnd = newStart;
  } else {
    newEnd = entryDateKey;
    if (newEnd < newStart) newStart = newEnd;
  }

  const city = findBlockCity(days, startDateKey, endDateKey);
  const hasStay = hasStayLocation(updatedStay);

  const tripStart = days[0]?.date;
  const tripEnd = days[days.length - 1]?.date;
  if (!tripStart || !tripEnd) return null;

  const expanded = expandTripDaysToCoverRange(days, tripStart, tripEnd, newStart, newEnd);
  let nextDays = clearStayBlockDays(expanded.days, startDateKey, endDateKey);

  nextDays = nextDays.map((day) => {
    if (day.date < newStart || day.date > newEnd) return day;
    if (hasStay) {
      return { ...day, city, stay: updatedStay };
    }
    return { ...day, city, stay: undefined };
  });

  return syncStayPlanItems(nextDays);
}

export function removeStayBlockForAutoEntry(
  days: TripDayPlan[],
  entryId: string
): TripDayPlan[] | null {
  const parsed = parseAutoStayEntryId(entryId);
  if (!parsed) return null;

  const block = getStayBlockIndices(days, parsed);
  if (!block) return null;

  const anchorCity = days[block.startIndex].city;
  let blockStartIndex = block.startIndex;
  while (blockStartIndex > 0) {
    const previousDay = days[blockStartIndex - 1];
    if (previousDay.stay || !previousDay.city) break;
    if (anchorCity && previousDay.city?.label !== anchorCity.label) break;
    blockStartIndex--;
  }

  return removeStayBlockDays(
    days,
    days[blockStartIndex].date,
    days[block.endIndex].date
  );
}

export function isSameStay(left: TripDayStay, right: TripDayStay): boolean {
  const leftKey = left.location?.placeId ?? left.location?.label ?? left.title;
  const rightKey = right.location?.placeId ?? right.location?.label ?? right.title;
  return leftKey === rightKey;
}

function upsertEntryOnDay(day: TripDayPlan, entry: TripItineraryEntry): TripDayPlan {
  const existingIndex = day.entries.findIndex((item) => item.id === entry.id);
  const entries =
    existingIndex >= 0
      ? day.entries.map((item, index) => (index === existingIndex ? entry : item))
      : [...day.entries, entry];
  return { ...day, entries: sortTripEntries(entries) };
}

function createCheckInEntry(day: TripDayPlan): TripItineraryEntry | null {
  const stay = day.stay;
  if (!stay?.checkInTime) return null;

  const placeLabel = getStayDisplayLabel(stay);
  return {
    id: stayCheckInEntryId(day.date),
    title: placeLabel ? `Check in · ${placeLabel}` : 'Check in',
    tag: 'lodging',
    startTime: stay.checkInTime,
    location: stay.location,
  };
}

function createCheckOutEntry(stayDay: TripDayPlan): TripItineraryEntry | null {
  const stay = stayDay.stay;
  if (!stay?.checkOutTime) return null;

  const placeLabel = getStayDisplayLabel(stay);
  return {
    id: stayCheckOutEntryId(stayDay.date),
    title: placeLabel ? `Check out · ${placeLabel}` : 'Check out',
    tag: 'lodging',
    startTime: stay.checkOutTime,
    location: stay.location,
  };
}

/** Creates or updates check-in / check-out plan items from day stays. */
export function syncStayPlanItems(
  days: TripDayPlan[],
  options?: { maxEndDate?: string }
): TripDayPlan[] {
  let nextDays = days.map((day) => ({
    ...day,
    entries: day.entries.filter((entry) => !isAutoStayEntryId(entry.id)),
  }));

  for (let index = 0; index < nextDays.length; index++) {
    const day = nextDays[index];
    if (!day.stay) continue;

    const previousDay = index > 0 ? nextDays[index - 1] : null;
    const isFirstNightOfBlock =
      !previousDay?.stay || !isSameStay(previousDay.stay, day.stay);

    if (isFirstNightOfBlock) {
      const checkInEntry = createCheckInEntry(day);
      if (checkInEntry) {
        nextDays[index] = upsertEntryOnDay(nextDays[index], checkInEntry);
      }
    }
  }

  for (let index = 0; index < nextDays.length; index++) {
    const day = nextDays[index];
    if (!day.stay) continue;

    const followingDay = index + 1 < nextDays.length ? nextDays[index + 1] : null;
    const isLastNightOfBlock =
      !followingDay?.stay || !isSameStay(followingDay.stay, day.stay);

    if (isLastNightOfBlock) {
      const checkOutEntry = createCheckOutEntry(day);
      if (checkOutEntry) {
        nextDays[index] = upsertEntryOnDay(nextDays[index], checkOutEntry);
      }
    }
  }

  if (options?.maxEndDate) {
    return nextDays.filter((day) => day.date <= options.maxEndDate!);
  }

  return nextDays;
}

function findBlockCity(
  days: TripDayPlan[],
  startDateKey: string,
  endDateKey: string
): TripLocation | undefined {
  for (const day of days) {
    if (day.date < startDateKey || day.date > endDateKey) continue;
    if (day.city?.label?.trim()) return day.city;
  }
  return undefined;
}

export function collectTripStayBlocks(days: TripDayPlan[]): TripStayBlockRecord[] {
  const blocks: TripStayBlockRecord[] = [];
  let index = 0;

  while (index < days.length) {
    const day = days[index];
    if (day.stay) {
      const startIndex = index;
      const stay = day.stay;
      while (
        index + 1 < days.length &&
        days[index + 1].stay &&
        isSameStay(stay, days[index + 1].stay!)
      ) {
        index++;
      }

      let blockStartIndex = startIndex;
      const anchorCity = days[startIndex].city;
      while (blockStartIndex > 0) {
        const previousDay = days[blockStartIndex - 1];
        if (previousDay.stay || !previousDay.city) break;
        if (anchorCity && previousDay.city?.label !== anchorCity.label) break;
        blockStartIndex--;
      }

      blocks.push({
        blockKey: days[blockStartIndex].date,
        startDateKey: days[blockStartIndex].date,
        endDateKey: days[index].date,
        city: findBlockCity(days, days[blockStartIndex].date, days[index].date),
        stay,
      });
      index++;
      continue;
    }

    if (day.city?.label) {
      const city = day.city;
      const blockStartIndex = index;
      while (
        index + 1 < days.length &&
        !days[index + 1].stay &&
        days[index + 1].city?.label === city.label
      ) {
        index++;
      }

      blocks.push({
        blockKey: days[blockStartIndex].date,
        startDateKey: days[blockStartIndex].date,
        endDateKey: days[index].date,
        city,
      });
      index++;
      continue;
    }

    index++;
  }

  return blocks;
}

export function buildStayBlockDisplayLabel(block: TripStayBlockRecord): string {
  if (block.stay) return getStayDisplayLabel(block.stay);
  return block.city?.label ?? 'City & Stay';
}

function findFlightLegLocation(
  day: TripDayPlan,
  kind: 'arrive' | 'depart'
): TripLocation | undefined {
  for (const entry of day.entries) {
    const parsed = parseAutoFlightEntryId(entry.id);
    if (parsed?.kind === kind && entry.location) {
      return entry.location;
    }
  }
  return undefined;
}

/** Resolves the city / stay lines shown on a day header. */
export function getTripDayDisplayContext(day: TripDayPlan): TripDayDisplayContext {
  let cityLabel: string | undefined;
  if (day.city?.label) {
    cityLabel = day.city.label;
  } else {
    const arriveLocation = findFlightLegLocation(day, 'arrive');
    if (arriveLocation) {
      cityLabel =
        getAirportCityFromTripLocation(arriveLocation) ??
        (arriveLocation.source === 'manual' ? arriveLocation.label : undefined);
    }
  }

  const stayLabel = day.stay ? getStayDisplayLabel(day.stay) : undefined;

  return { cityLabel, stayLabel };
}

export function clearStayBlockDays(
  days: TripDayPlan[],
  startDateKey: string,
  endDateKey: string
): TripDayPlan[] {
  return days.map((day) => {
    if (day.date < startDateKey || day.date > endDateKey) return day;
    return {
      ...day,
      city: undefined,
      stay: undefined,
      entries: day.entries.filter((entry) => !isAutoStayEntryId(entry.id)),
    };
  });
}

export function removeStayBlockDays(
  days: TripDayPlan[],
  startDateKey: string,
  endDateKey: string
): TripDayPlan[] {
  return syncStayPlanItems(clearStayBlockDays(days, startDateKey, endDateKey));
}
