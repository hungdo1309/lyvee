import { addDays, format } from 'date-fns';
import { TripDayPlan } from '../types/trips';
import {
  clearStayBlockDays,
  collectTripStayBlocks,
} from './tripStayEntries';
import {
  applyStayBlockToDays,
  tripStayBlockToInput,
} from './tripStays';
import {
  collectTripFlights,
  tripFlightRecordToInput,
} from './tripFlightEntries';
import { replaceTripFlightDays, TripFlightInput } from './tripFlights';
import {
  clampTripDateKey,
  countTripDays,
  formatTripDateKey,
  getTripDateRangeError,
  maxDateKey,
  minDateKey,
  parseTripDateKey,
} from './trips';

export { expandTripDaysForOutsideRange, maxDateKey, minDateKey } from './trips';

export function clampTripDateTimeToRange(
  date: Date,
  tripStartDate: string,
  tripEndDate: string
): Date {
  const dateKey = format(date, 'yyyy-MM-dd');
  const clampedKey = clampTripDateKey(dateKey, tripStartDate, tripEndDate);
  if (clampedKey === dateKey) return date;

  const result = parseTripDateKey(clampedKey);
  result.setHours(date.getHours(), date.getMinutes(), 0, 0);
  return result;
}

export function flightInputDateRange(input: TripFlightInput): {
  requiredStartDate: string;
  requiredEndDate: string;
} {
  const departDateKey = format(input.departAt, 'yyyy-MM-dd');
  const arriveDateKey = format(input.arriveAt, 'yyyy-MM-dd');
  return {
    requiredStartDate: minDateKey(departDateKey, arriveDateKey),
    requiredEndDate: maxDateKey(departDateKey, arriveDateKey),
  };
}

export function adjustStayBlocksToTripRange(
  sourceDays: TripDayPlan[],
  targetDays: TripDayPlan[],
  tripStartDate: string,
  tripEndDate: string
): TripDayPlan[] {
  const blocks = collectTripStayBlocks(sourceDays);
  let nextDays = targetDays;

  for (const block of blocks) {
    if (block.endDateKey < tripStartDate || block.startDateKey > tripEndDate) {
      nextDays = clearStayBlockDays(nextDays, block.startDateKey, block.endDateKey);
      continue;
    }

    const clampedStart = maxDateKey(block.startDateKey, tripStartDate);
    const clampedEnd = minDateKey(block.endDateKey, tripEndDate);

    nextDays = clearStayBlockDays(nextDays, block.startDateKey, block.endDateKey);

    if (clampedStart > clampedEnd) {
      continue;
    }

    nextDays = applyStayBlockToDays(nextDays, {
      ...tripStayBlockToInput(block),
      startDateKey: clampedStart,
      endDateKey: clampedEnd,
    });
  }

  return nextDays;
}

export function adjustFlightsToTripRange(
  sourceDays: TripDayPlan[],
  targetDays: TripDayPlan[],
  tripStartDate: string,
  tripEndDate: string
): TripDayPlan[] {
  const flights = collectTripFlights(sourceDays);
  let nextDays = targetDays;

  for (const flight of flights) {
    const needsAdjust =
      flight.departDateKey < tripStartDate ||
      flight.departDateKey > tripEndDate ||
      flight.arriveDateKey < tripStartDate ||
      flight.arriveDateKey > tripEndDate;

    if (!needsAdjust) continue;

    const input = tripFlightRecordToInput(flight);
    input.departAt = clampTripDateTimeToRange(input.departAt, tripStartDate, tripEndDate);
    input.arriveAt = clampTripDateTimeToRange(input.arriveAt, tripStartDate, tripEndDate);

    if (input.arriveAt.getTime() < input.departAt.getTime()) {
      input.arriveAt = input.departAt;
    }

    nextDays = replaceTripFlightDays(nextDays, flight.flightKey, input);
  }

  return nextDays;
}

/** Resizes trip days when trip dates change. Shrinking adjusts flights and city/stay blocks. */
export function resizeTripDayPlans(
  days: TripDayPlan[],
  tripStartDate: string,
  tripEndDate: string,
  newStartDate: string,
  newEndDate: string
): TripDayPlan[] {
  const rangeError = getTripDateRangeError(newStartDate, newEndDate);
  if (rangeError) {
    throw new Error(rangeError);
  }

  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const start = parseTripDateKey(newStartDate);
  const dayCount = countTripDays(newStartDate, newEndDate);

  let nextDays = Array.from({ length: dayCount }, (_, index) => {
    const date = formatTripDateKey(addDays(start, index));
    return dayByDate.get(date) ?? { date, entries: [] };
  });

  const isShrinking =
    newStartDate > tripStartDate || newEndDate < tripEndDate;

  if (isShrinking) {
    nextDays = adjustStayBlocksToTripRange(days, nextDays, newStartDate, newEndDate);
    nextDays = adjustFlightsToTripRange(days, nextDays, newStartDate, newEndDate);
  }

  return nextDays;
}
