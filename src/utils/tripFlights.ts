import { format } from 'date-fns';
import { TripLocation } from '../types/places';
import { TripDayPlan, TripItineraryEntry } from '../types/trips';
import { createTripEntryId, insertTripEntryInOrder } from './trips';
import { formatTripTimeValue } from './tripTime';

export interface TripFlightInput {
  airline?: string;
  flightNumber?: string;
  departLocation: TripLocation;
  departAt: Date;
  arriveLocation: TripLocation;
  arriveAt: Date;
  notes?: string;
}

export interface TripFlightEntryDraft {
  dateKey: string;
  entry: TripItineraryEntry;
}

function buildFlightLabel(airline?: string, flightNumber?: string): string {
  const parts = [airline?.trim(), flightNumber?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Flight';
}

export function buildTripFlightEntriesWithKey(
  flightKey: string,
  input: TripFlightInput
): TripFlightEntryDraft[] {
  const flightLabel = buildFlightLabel(input.airline, input.flightNumber);
  const notes = input.notes?.trim() || undefined;

  const departDateKey = format(input.departAt, 'yyyy-MM-dd');
  const arriveDateKey = format(input.arriveAt, 'yyyy-MM-dd');

  const departTime = formatTripTimeValue(input.departAt);
  const arriveTime = formatTripTimeValue(input.arriveAt);

  return [
    {
      dateKey: departDateKey,
      entry: {
        id: `${flightKey}_depart`,
        title: `Depart · ${flightLabel}`,
        tag: 'flight',
        startTime: departTime,
        location: input.departLocation,
        notes,
      },
    },
    {
      dateKey: arriveDateKey,
      entry: {
        id: `${flightKey}_arrive`,
        title: `Arrive · ${flightLabel}`,
        tag: 'flight',
        startTime: arriveTime,
        location: input.arriveLocation,
        notes,
      },
    },
  ];
}

export function buildTripFlightEntries(input: TripFlightInput): TripFlightEntryDraft[] {
  const flightKey = createTripEntryId().replace(/^entry_/, 'flight_');
  return buildTripFlightEntriesWithKey(flightKey, input);
}

export function replaceTripFlightDays(
  days: TripDayPlan[],
  flightKey: string,
  input: TripFlightInput
): TripDayPlan[] {
  const departId = `${flightKey}_depart`;
  const arriveId = `${flightKey}_arrive`;

  let nextDays = days.map((day) => ({
    ...day,
    entries: day.entries.filter((entry) => entry.id !== departId && entry.id !== arriveId),
  }));

  const drafts = buildTripFlightEntriesWithKey(flightKey, input);
  for (const draft of drafts) {
    nextDays = nextDays.map((day) => {
      if (day.date !== draft.dateKey) return day;
      return {
        ...day,
        entries: insertTripEntryInOrder(day.entries, draft.entry),
      };
    });
  }

  return nextDays;
}

export function validateTripFlightInput(input: TripFlightInput): void {
  if (!input.departLocation.label.trim()) {
    throw new Error('Choose a departure airport or city');
  }
  if (!input.arriveLocation.label.trim()) {
    throw new Error('Choose an arrival airport or city');
  }
  if (input.arriveAt.getTime() < input.departAt.getTime()) {
    throw new Error('Arrival must be after departure');
  }
}
