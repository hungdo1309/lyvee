import { parseISO } from 'date-fns';
import { TripLocation } from '../types/places';
import { TripDayPlan, TripItineraryEntry } from '../types/trips';
import { parseTripDateKey } from './trips';
import { isAutoFlightEntryId, parseAutoFlightEntryId } from './tripFlightIds';
import { replaceTripFlightDays, TripFlightInput, validateTripFlightInput } from './tripFlights';
import { isValidTripTime } from './tripTime';

export interface TripFlightRecord {
  flightKey: string;
  airline?: string;
  flightNumber?: string;
  departLocation: TripLocation;
  departDateKey: string;
  departTime?: string;
  arriveLocation: TripLocation;
  arriveDateKey: string;
  arriveTime?: string;
  notes?: string;
}

export { isAutoFlightEntryId, parseAutoFlightEntryId } from './tripFlightIds';

export function parseFlightLabelFromEntryTitle(title: string): string {
  return title.replace(/^(Depart|Arrive) · /, '').trim();
}

export function parseFlightLabelFields(label: string): {
  airline?: string;
  flightNumber?: string;
} {
  const trimmed = label.trim();
  if (!trimmed || trimmed === 'Flight') return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { flightNumber: parts[0] };
  return { airline: parts[0], flightNumber: parts.slice(1).join(' ') };
}

export function buildFlightDisplayLabel(record: TripFlightRecord): string {
  const parts = [record.airline?.trim(), record.flightNumber?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Flight';
}

function dateTimeFromDay(dateKey: string, time?: string): Date {
  const date = parseISO(dateKey);
  if (time && isValidTripTime(time)) {
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

export function tripFlightRecordToInput(record: TripFlightRecord): TripFlightInput {
  return {
    airline: record.airline,
    flightNumber: record.flightNumber,
    departLocation: record.departLocation,
    departAt: dateTimeFromDay(record.departDateKey, record.departTime),
    arriveLocation: record.arriveLocation,
    arriveAt: dateTimeFromDay(record.arriveDateKey, record.arriveTime),
    notes: record.notes,
  };
}

export function findTripFlightByEntryId(
  days: TripDayPlan[],
  entryId: string
): TripFlightRecord | null {
  const parsed = parseAutoFlightEntryId(entryId);
  if (!parsed) return null;
  return collectTripFlights(days).find((flight) => flight.flightKey === parsed.flightKey) ?? null;
}

export function collectTripFlights(days: TripDayPlan[]): TripFlightRecord[] {
  const flights = new Map<string, Partial<TripFlightRecord>>();

  for (const day of days) {
    for (const entry of day.entries) {
      const parsed = parseAutoFlightEntryId(entry.id);
      if (!parsed || !entry.location) continue;

      const record = flights.get(parsed.flightKey) ?? { flightKey: parsed.flightKey };
      const label = parseFlightLabelFromEntryTitle(entry.title);
      const { airline, flightNumber } = parseFlightLabelFields(label);
      record.airline = airline;
      record.flightNumber = flightNumber;
      record.notes = entry.notes ?? record.notes;

      if (parsed.kind === 'depart') {
        record.departLocation = entry.location;
        record.departDateKey = day.date;
        record.departTime = entry.startTime;
      } else {
        record.arriveLocation = entry.location;
        record.arriveDateKey = day.date;
        record.arriveTime = entry.startTime;
      }

      flights.set(parsed.flightKey, record);
    }
  }

  return Array.from(flights.values())
    .filter(
      (record): record is TripFlightRecord =>
        Boolean(
          record.departLocation &&
            record.arriveLocation &&
            record.departDateKey &&
            record.arriveDateKey
        )
    )
    .sort((left, right) => {
      const leftKey = `${left.departDateKey}T${left.departTime ?? '00:00'}`;
      const rightKey = `${right.departDateKey}T${right.departTime ?? '00:00'}`;
      return leftKey.localeCompare(rightKey);
    });
}

export function buildAutoFlightEntryTitle(
  kind: 'depart' | 'arrive',
  flightLabel: string
): string {
  const prefix = kind === 'depart' ? 'Depart' : 'Arrive';
  return flightLabel ? `${prefix} · ${flightLabel}` : prefix;
}

function flightPairId(flightKey: string, kind: 'depart' | 'arrive'): string {
  return `${flightKey}_${kind}`;
}

function dateTimeFromDateKeyAndTime(
  dateKey: string,
  time?: string,
  fallback?: Date
): Date {
  const date = parseTripDateKey(dateKey);
  if (time && isValidTripTime(time)) {
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else if (fallback) {
    date.setHours(fallback.getHours(), fallback.getMinutes(), 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

export function buildFlightInputFromLegEntry(
  days: TripDayPlan[],
  entry: TripItineraryEntry,
  entryDateKey: string
): { flightKey: string; input: TripFlightInput } | null {
  const parsed = parseAutoFlightEntryId(entry.id);
  if (!parsed) return null;

  const flight = collectTripFlights(days).find((item) => item.flightKey === parsed.flightKey);
  if (!flight) return null;

  const input = tripFlightRecordToInput(flight);

  if (parsed.kind === 'depart') {
    if (entry.location) input.departLocation = entry.location;
    input.departAt = dateTimeFromDateKeyAndTime(entryDateKey, entry.startTime, input.departAt);
  } else {
    if (entry.location) input.arriveLocation = entry.location;
    input.arriveAt = dateTimeFromDateKeyAndTime(entryDateKey, entry.startTime, input.arriveAt);
  }

  if (entry.notes !== undefined) {
    input.notes = entry.notes.trim() || undefined;
  }

  return { flightKey: parsed.flightKey, input };
}

/** Updates one flight leg from a plan item edit and repositions entries onto the correct days. */
export function applyAutoFlightEntryUpdate(
  days: TripDayPlan[],
  entry: TripItineraryEntry,
  entryDateKey: string
): TripDayPlan[] | null {
  const built = buildFlightInputFromLegEntry(days, entry, entryDateKey);
  if (!built) return null;

  validateTripFlightInput(built.input);
  return replaceTripFlightDays(days, built.flightKey, built.input);
}

export function removeFlightPairForAutoEntry(
  days: TripDayPlan[],
  entryId: string
): TripDayPlan[] | null {
  const parsed = parseAutoFlightEntryId(entryId);
  if (!parsed) return null;

  const departId = flightPairId(parsed.flightKey, 'depart');
  const arriveId = flightPairId(parsed.flightKey, 'arrive');

  return days.map((day) => ({
    ...day,
    entries: day.entries.filter((entry) => entry.id !== departId && entry.id !== arriveId),
  }));
}
