import { TripLocation } from '../types/places';
import { TripDayPlan, TripDayStay } from '../types/trips';
import { getTripDateRangeError, expandTripDaysForOutsideRange, maxDateKey, minDateKey } from './trips';
import {
  clearStayBlockDays,
  syncStayPlanItems,
  TripStayBlockRecord,
} from './tripStayEntries';

export interface TripStayInput {
  city?: TripLocation | null;
  stay?: TripDayStay;
  startDateKey: string;
  endDateKey: string;
}

function hasStayLocation(stay?: TripDayStay): boolean {
  return Boolean(stay?.location?.label?.trim() || stay?.title?.trim());
}

export function tripStayBlockToInput(block: TripStayBlockRecord): TripStayInput {
  return {
    city: block.city ?? null,
    stay: block.stay,
    startDateKey: block.startDateKey,
    endDateKey: block.endDateKey,
  };
}

export function validateTripStayInput(
  input: TripStayInput,
  tripStartDate?: string,
  tripEndDate?: string
): void {
  const hasCity = Boolean(input.city?.label?.trim());

  if (!hasCity) {
    throw new Error('Choose a city');
  }

  const rangeError = getTripDateRangeError(input.startDateKey, input.endDateKey);
  if (rangeError) {
    throw new Error(rangeError);
  }

  if (tripStartDate && tripEndDate) {
    const requiredEndDate = getStayBlockRequiredEndDate(input);
    const expandedStartDate = minDateKey(input.startDateKey, tripStartDate);
    const expandedEndDate = maxDateKey(requiredEndDate, tripEndDate);
    const expandedRangeError = getTripDateRangeError(expandedStartDate, expandedEndDate);
    if (expandedRangeError) {
      throw new Error(expandedRangeError);
    }
  }
}

function getStayBlockRequiredEndDate(input: TripStayInput): string {
  return input.endDateKey;
}

export function applyStayBlockToDays(
  days: TripDayPlan[],
  input: TripStayInput,
  options?: { maxEndDate?: string }
): TripDayPlan[] {
  const { startDateKey, endDateKey } = input;
  const city = input.city?.label?.trim() ? input.city : undefined;
  const hasStay = hasStayLocation(input.stay);

  const nextDays = days.map((day) => {
    if (day.date < startDateKey || day.date > endDateKey) return day;

    if (hasStay) {
      return {
        ...day,
        city,
        stay: input.stay,
      };
    }

    return {
      ...day,
      city,
      stay: undefined,
    };
  });

  return syncStayPlanItems(nextDays, options);
}

export interface TripStayDaysWriteResult {
  days: TripDayPlan[];
  startDate: string;
  endDate: string;
}

export function replaceStayBlockDays(
  days: TripDayPlan[],
  previousBlock: { startDateKey: string; endDateKey: string } | null,
  input: TripStayInput,
  tripStartDate: string,
  tripEndDate: string
): TripStayDaysWriteResult {
  let nextDays = days;
  if (previousBlock) {
    nextDays = clearStayBlockDays(
      nextDays,
      previousBlock.startDateKey,
      previousBlock.endDateKey
    );
  }
  return prepareStayBlockDaysForWrite(nextDays, input, tripStartDate, tripEndDate);
}

export function prepareStayBlockDaysForWrite(
  days: TripDayPlan[],
  input: TripStayInput,
  tripStartDate: string,
  tripEndDate: string
): TripStayDaysWriteResult {
  const requiredEndDate = getStayBlockRequiredEndDate(input);
  const expanded = expandTripDaysForOutsideRange(
    days,
    tripStartDate,
    tripEndDate,
    input.startDateKey,
    requiredEndDate
  );
  const clearedDays = clearStayBlockDays(
    expanded.days,
    input.startDateKey,
    input.endDateKey
  );
  const nextDays = applyStayBlockToDays(clearedDays, input);
  const lastDayDate = nextDays[nextDays.length - 1]?.date ?? expanded.endDate;
  return {
    days: nextDays,
    startDate: minDateKey(tripStartDate, expanded.startDate),
    endDate: maxDateKey(tripEndDate, maxDateKey(expanded.endDate, lastDayDate ?? tripEndDate)),
  };
}
