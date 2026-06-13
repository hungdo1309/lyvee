import {
  DEFAULT_TRIP_ENTRY_TAG,
  TripDayPlan,
  TripDayStay,
  TripItineraryEntry,
} from '../types/trips';
import { TripLocation } from '../types/places';
import { normalizeTripTag } from './trips';
import { isAutoFlightEntryId } from './tripFlightEntries';

const LEGACY_CATEGORY_TO_TAG: Record<string, string> = {
  activity: 'activity',
  food: 'food',
  lodging: 'lodging',
  transport: 'transport',
  note: 'note',
};

export function parseTripLocation(raw: unknown): TripLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const label = typeof obj.label === 'string' ? obj.label.trim() : '';
  if (!label) return undefined;

  return {
    label,
    detail: typeof obj.detail === 'string' ? obj.detail.trim() || undefined : undefined,
    placeId: typeof obj.placeId === 'string' ? obj.placeId : undefined,
    source: obj.source === 'manual' ? 'manual' : 'search',
  };
}

function parseTripDayStay(raw: unknown): TripDayStay | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const location = parseTripLocation(obj.location);
  const legacyTitle = typeof obj.title === 'string' ? obj.title.trim() : '';
  const resolvedLocation =
    location ?? (legacyTitle ? { label: legacyTitle, source: 'manual' as const } : undefined);
  if (!resolvedLocation?.label) return undefined;

  return {
    title: resolvedLocation.label,
    location: resolvedLocation,
    checkInTime: typeof obj.checkInTime === 'string' ? obj.checkInTime : undefined,
    checkOutTime: typeof obj.checkOutTime === 'string' ? obj.checkOutTime : undefined,
    notes: typeof obj.notes === 'string' ? obj.notes.trim() || undefined : undefined,
  };
}

function migrateEntryTag(raw: Record<string, unknown>): string {
  if (Array.isArray(raw.tags)) {
    const firstTag = raw.tags.find((tag): tag is string => typeof tag === 'string');
    if (firstTag) {
      return normalizeTripTag(firstTag);
    }
  }

  if (typeof raw.tag === 'string') {
    return normalizeTripTag(raw.tag);
  }

  const legacyCategory =
    typeof raw.category === 'string' ? LEGACY_CATEGORY_TO_TAG[raw.category] : undefined;
  return normalizeTripTag(legacyCategory ?? DEFAULT_TRIP_ENTRY_TAG);
}

export function migrateTripEntry(raw: Record<string, unknown>): TripItineraryEntry {
  const id = String(raw.id ?? '');
  const title = String(raw.title ?? '').trim();
  let tag = migrateEntryTag(raw);
  if (isAutoFlightEntryId(id)) {
    tag = 'flight';
  } else if (tag === 'transport' && id.startsWith('flight_')) {
    tag = 'flight';
  }
  const legacyTime = typeof raw.time === 'string' ? raw.time : undefined;
  const legacyPlace = typeof raw.place === 'string' ? raw.place.trim() : '';

  return {
    id,
    title,
    tag,
    startTime:
      typeof raw.startTime === 'string'
        ? raw.startTime
        : legacyTime,
    endTime: typeof raw.endTime === 'string' ? raw.endTime : undefined,
    location: legacyPlace
      ? { label: legacyPlace, source: 'manual' as const }
      : parseTripLocation(raw.location),
    notes: typeof raw.notes === 'string' ? raw.notes.trim() || undefined : undefined,
  };
}

export function migrateTripDay(raw: unknown): TripDayPlan {
  if (!raw || typeof raw !== 'object') {
    return { date: '', entries: [] };
  }

  const obj = raw as Record<string, unknown>;
  const entries = Array.isArray(obj.entries)
    ? obj.entries.map((entry) =>
        migrateTripEntry(
          entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
        )
      )
    : [];

  return {
    date: String(obj.date ?? ''),
    city: parseTripLocation(obj.city),
    stay: parseTripDayStay(obj.stay),
    entries,
  };
}
