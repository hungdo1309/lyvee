import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TripLocation } from '../types/places';
import { Trip, TripDayPlan, TripDayStay, TripInput, TripItineraryEntry } from '../types/trips';
import { migrateTripDay } from '../utils/tripMigration';
import { stripUndefined } from '../utils/firestore';
import {
  syncStayPlanItems,
  removeStayBlockForAutoEntry,
  removeStayBlockDays,
  applyAutoStayEntryUpdate,
  isAutoStayEntryId,
} from '../utils/tripStayEntries';
import { buildFlightInputFromLegEntry, removeFlightPairForAutoEntry, isAutoFlightEntryId } from '../utils/tripFlightEntries';
import {
  applyCityToFollowingDays,
  applyStayToFollowingDays,
  buildTripDayPlans,
  getTripTimeRangeError,
  isValidDestination,
  isValidTripDateRange,
  isValidTripTime,
  MAX_ENTRY_LOCATION_LENGTH,
  MAX_ENTRY_NOTES_LENGTH,
  MAX_ENTRY_TITLE_LENGTH,
  mergeTripEntryUpdate,
  normalizeDestination,
  normalizeTripTag,
  insertTripEntryInOrder,
} from '../utils/trips';
import { buildTripFlightEntries, replaceTripFlightDays, TripFlightInput, validateTripFlightInput } from '../utils/tripFlights';
import {
  expandTripDaysForOutsideRange,
  flightInputDateRange,
  maxDateKey,
  minDateKey,
  resizeTripDayPlans,
} from '../utils/tripDates';
import {
  prepareStayBlockDaysForWrite,
  replaceStayBlockDays,
  TripStayInput,
  validateTripStayInput,
} from '../utils/tripStays';
import { TripStayBlockRecord } from '../utils/tripStayEntries';
import { getGroup } from './groupLookup';
import { canDeleteTrip, canEditTrip, normalizeTripMemberIds } from '../utils/tripPermissions';

const MAX_TRIP_MEMBERS = 50;

function parseMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function parseTrip(id: string, data: Record<string, unknown>): Trip {
  const days = Array.isArray(data.days)
    ? data.days.map((day) => migrateTripDay(day))
    : [];

  return {
    id,
    groupId: String(data.groupId ?? ''),
    destination: String(data.destination ?? ''),
    destinationDetail:
      typeof data.destinationDetail === 'string' ? data.destinationDetail : undefined,
    placeId: typeof data.placeId === 'string' ? data.placeId : undefined,
    destinationSource:
      data.destinationSource === 'manual' || data.destinationSource === 'search'
        ? data.destinationSource
        : data.placeId
          ? 'search'
          : 'manual',
    startDate: String(data.startDate ?? ''),
    endDate: String(data.endDate ?? ''),
    days,
    memberIds: parseMemberIds(data.memberIds),
    expenseGroupId:
      typeof data.expenseGroupId === 'string' && data.expenseGroupId.length > 0
        ? data.expenseGroupId
        : undefined,
    createdBy: String(data.createdBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

function validateTripInput(input: TripInput, userId: string, groupMembers: string[]): TripInput {
  const destination = normalizeDestination(input.destination);
  if (!isValidDestination(destination)) {
    throw new Error('Enter a destination (at least 2 characters)');
  }
  if (!input.groupId) {
    throw new Error('Select a group for this trip');
  }
  if (!isValidTripDateRange(input.startDate, input.endDate)) {
    throw new Error('Choose a valid date range (up to 60 days)');
  }

  const memberIds = normalizeTripMemberIds(input.memberIds, groupMembers, userId);
  if (memberIds.length === 0) {
    throw new Error('Add at least one group member to this trip');
  }
  if (memberIds.length > MAX_TRIP_MEMBERS) {
    throw new Error(`A trip can include up to ${MAX_TRIP_MEMBERS} members`);
  }

  const destinationDetail = input.destinationDetail?.trim();

  return {
    groupId: input.groupId,
    destination,
    destinationDetail: destinationDetail || undefined,
    placeId: input.placeId?.trim() || undefined,
    destinationSource: input.destinationSource ?? (input.placeId ? 'search' : 'manual'),
    startDate: input.startDate,
    endDate: input.endDate,
    memberIds,
  };
}

function validateLocation(
  location: TripLocation | undefined,
  fieldName: string,
  maxLength: number
): TripLocation | undefined {
  if (!location) return undefined;
  const label = location.label.trim();
  if (!label) return undefined;
  if (label.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less`);
  }
  return {
    label,
    detail: location.detail?.trim() || undefined,
    placeId: location.placeId,
    source: location.source,
  };
}

function validateStay(stay: TripDayStay | null | undefined): TripDayStay | undefined {
  if (!stay) return undefined;

  const rawLocation =
    stay.location ??
    (stay.title.trim()
      ? ({ label: stay.title.trim(), source: 'manual' as const } satisfies TripLocation)
      : undefined);

  const location = validateLocation(rawLocation, 'Stay location', MAX_ENTRY_LOCATION_LENGTH);
  if (!location) {
    throw new Error('Choose a stay location');
  }

  const notes = stay.notes?.trim();
  if (stay.checkInTime && !isValidTripTime(stay.checkInTime)) {
    throw new Error('Check-in time must use HH:mm format');
  }
  if (stay.checkOutTime && !isValidTripTime(stay.checkOutTime)) {
    throw new Error('Check-out time must use HH:mm format');
  }

  return {
    title: location.label,
    location,
    checkInTime: stay.checkInTime,
    checkOutTime: stay.checkOutTime,
    notes: notes || undefined,
  };
}

function validateEntry(entry: TripItineraryEntry): TripItineraryEntry {
  const title = entry.title.trim();
  if (!title) {
    throw new Error('Add a title for this plan item');
  }
  if (title.length > MAX_ENTRY_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_ENTRY_TITLE_LENGTH} characters or less`);
  }

  const notes = entry.notes?.trim();
  if (notes && notes.length > MAX_ENTRY_NOTES_LENGTH) {
    throw new Error(`Notes must be ${MAX_ENTRY_NOTES_LENGTH} characters or less`);
  }

  const timeError = getTripTimeRangeError(entry.startTime, entry.endTime);
  if (timeError) throw new Error(timeError);

  return {
    ...entry,
    title,
    tag: normalizeTripTag(entry.tag),
    notes: notes || undefined,
    location: validateLocation(entry.location, 'Location', MAX_ENTRY_LOCATION_LENGTH),
    startTime: entry.startTime,
    endTime: entry.endTime,
  };
}

function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((left, right) => {
    const byStart = right.startDate.localeCompare(left.startDate);
    if (byStart !== 0) return byStart;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function buildGroupTripsQuery(groupId: string) {
  return query(collection(db, 'trips'), where('groupId', '==', groupId));
}

export async function createTrip(userId: string, input: TripInput): Promise<string> {
  const group = await getGroup(input.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  if (!group.members.includes(userId)) {
    throw new Error('You must be a group member to create a trip');
  }

  const validated = validateTripInput(input, userId, group.members);
  const tripRef = doc(collection(db, 'trips'));
  const now = new Date().toISOString();

  const trip: Omit<Trip, 'id'> = {
    groupId: validated.groupId,
    destination: validated.destination,
    destinationDetail: validated.destinationDetail,
    placeId: validated.placeId,
    destinationSource: validated.destinationSource,
    startDate: validated.startDate,
    endDate: validated.endDate,
    days: buildTripDayPlans(validated.startDate, validated.endDate),
    memberIds: validated.memberIds,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(tripRef, stripUndefined(trip));
  return tripRef.id;
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db, 'trips', tripId));
  if (!snap.exists()) return null;
  return parseTrip(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchGroupTripsOnce(groupId: string): Promise<Trip[]> {
  const snapshot = await getDocs(buildGroupTripsQuery(groupId));
  return sortTrips(
    snapshot.docs.map((entry) => parseTrip(entry.id, entry.data() as Record<string, unknown>))
  );
}

export async function fetchTripsForGroups(groupIds: string[]): Promise<Map<string, Trip[]>> {
  const entries = await Promise.all(
    groupIds.map(async (groupId) => {
      const trips = await fetchGroupTripsOnce(groupId);
      return [groupId, trips] as const;
    })
  );
  return new Map(entries);
}

export function subscribeToGroupTrips(
  groupId: string,
  onTrips: (trips: Trip[]) => void
): () => void {
  return onSnapshot(
    buildGroupTripsQuery(groupId),
    (snapshot) => {
      onTrips(
        sortTrips(
          snapshot.docs.map((entry) =>
            parseTrip(entry.id, entry.data() as Record<string, unknown>)
          )
        )
      );
    },
    (error) => {
      console.warn(`[trips] subscribeToGroupTrips (${groupId}):`, error.code, error.message);
      onTrips([]);
    }
  );
}

export function subscribeToTrip(
  tripId: string,
  onTrip: (trip: Trip | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'trips', tripId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onTrip(null);
        return;
      }
      onTrip(parseTrip(snapshot.id, snapshot.data() as Record<string, unknown>));
    },
    (error) => {
      console.warn(`[trips] subscribeToTrip (${tripId}):`, error.code, error.message);
      onTrip(null);
    }
  );
}

export async function updateTripDays(
  tripId: string,
  days: Trip['days'],
  dateRange?: { startDate: string; endDate: string }
): Promise<void> {
  await setDoc(
    doc(db, 'trips', tripId),
    stripUndefined({
      days,
      ...(dateRange
        ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
        : {}),
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
}

export async function updateTripDayPlan(
  trip: Trip,
  dateKey: string,
  updates: {
    city?: TripLocation | null;
    stay?: TripDayStay | null;
    applyCityToFollowing?: boolean;
    applyStayToFollowing?: boolean;
  }
): Promise<void> {
  const city =
    updates.city === null
      ? undefined
      : updates.city
        ? validateLocation(updates.city, 'City', MAX_ENTRY_LOCATION_LENGTH)
        : undefined;

  const stay =
    updates.stay === null ? undefined : validateStay(updates.stay ?? undefined);

  let days = trip.days.map((day) => {
    if (day.date !== dateKey) return day;
    const nextDay: TripDayPlan = { ...day, entries: day.entries };
    if (updates.city !== undefined) {
      nextDay.city = city;
    }
    if (updates.stay !== undefined) {
      nextDay.stay = stay;
    }
    return nextDay;
  });

  if (updates.applyCityToFollowing && city) {
    days = applyCityToFollowingDays(days, dateKey, city);
  }

  if (updates.applyStayToFollowing && stay) {
    days = applyStayToFollowingDays(days, dateKey, stay);
  }

  if (updates.stay !== undefined) {
    days = syncStayPlanItems(days);
    const lastDayDate = days[days.length - 1]?.date;
    if (lastDayDate && lastDayDate > trip.endDate) {
      await updateTripDays(trip.id, days, {
        startDate: trip.startDate,
        endDate: lastDayDate,
      });
      return;
    }
  }

  await updateTripDays(trip.id, days);
}

export async function upsertTripEntry(
  trip: Trip,
  dateKey: string,
  entry: TripItineraryEntry
): Promise<void> {
  const validated = validateEntry(entry);

  if (isAutoStayEntryId(validated.id)) {
    const syncedDays = applyAutoStayEntryUpdate(trip.days, validated, dateKey);
    if (syncedDays) {
      const firstDayDate = syncedDays[0]?.date ?? trip.startDate;
      const lastDayDate = syncedDays[syncedDays.length - 1]?.date ?? trip.endDate;
      await updateTripDays(trip.id, syncedDays, {
        startDate: minDateKey(trip.startDate, firstDayDate),
        endDate: maxDateKey(trip.endDate, lastDayDate),
      });
      return;
    }
  }

  if (isAutoFlightEntryId(validated.id)) {
    const built = buildFlightInputFromLegEntry(trip.days, validated, dateKey);
    if (built) {
      validateTripFlightInput(built.input);
      const { requiredStartDate, requiredEndDate } = flightInputDateRange(built.input);
      const expanded = expandTripDaysForOutsideRange(
        trip.days,
        trip.startDate,
        trip.endDate,
        requiredStartDate,
        requiredEndDate
      );
      const days = replaceTripFlightDays(expanded.days, built.flightKey, built.input);
      await updateTripDays(trip.id, days, {
        startDate: expanded.startDate,
        endDate: expanded.endDate,
      });
      return;
    }
  }

  const previousDateKey = trip.days.find((day) =>
    day.entries.some((item) => item.id === validated.id)
  )?.date;

  let nextDays = trip.days;
  let dateRange: { startDate: string; endDate: string } | undefined;

  if (dateKey < trip.startDate || dateKey > trip.endDate) {
    const expanded = expandTripDaysForOutsideRange(
      trip.days,
      trip.startDate,
      trip.endDate,
      dateKey,
      dateKey
    );
    nextDays = expanded.days;
    if (expanded.startDate !== trip.startDate || expanded.endDate !== trip.endDate) {
      dateRange = { startDate: expanded.startDate, endDate: expanded.endDate };
    }
  }

  nextDays = nextDays.map((day) => {
    if (previousDateKey && previousDateKey !== dateKey && day.date === previousDateKey) {
      return {
        ...day,
        entries: day.entries.filter((item) => item.id !== validated.id),
      };
    }

    if (day.date !== dateKey) return day;

    const existingIndex = day.entries.findIndex((item) => item.id === validated.id);
    const entries =
      existingIndex >= 0
        ? mergeTripEntryUpdate(day.entries, validated)
        : insertTripEntryInOrder(day.entries, validated);
    return { ...day, entries };
  });

  await updateTripDays(trip.id, nextDays, dateRange);
}

export async function reorderTripDayEntries(
  trip: Trip,
  dateKey: string,
  orderedEntryIds: string[]
): Promise<void> {
  const days = trip.days.map((day) => {
    if (day.date !== dateKey) return day;
    const byId = new Map(day.entries.map((entry) => [entry.id, entry]));
    const ordered = orderedEntryIds
      .map((entryId) => byId.get(entryId))
      .filter((entry): entry is TripItineraryEntry => Boolean(entry));

    for (const entry of day.entries) {
      if (!orderedEntryIds.includes(entry.id)) {
        ordered.push(entry);
      }
    }

    return { ...day, entries: ordered };
  });

  await updateTripDays(trip.id, days);
}

export async function addTripFlight(trip: Trip, input: TripFlightInput): Promise<void> {
  validateTripFlightInput(input);
  const { requiredStartDate, requiredEndDate } = flightInputDateRange(input);
  const expanded = expandTripDaysForOutsideRange(
    trip.days,
    trip.startDate,
    trip.endDate,
    requiredStartDate,
    requiredEndDate
  );
  let days = expanded.days;
  const drafts = buildTripFlightEntries(input);

  for (const draft of drafts) {
    const validated = validateEntry(draft.entry);
    days = days.map((day) => {
      if (day.date !== draft.dateKey) return day;
      return {
        ...day,
        entries: insertTripEntryInOrder(day.entries, validated),
      };
    });
  }

  await updateTripDays(trip.id, days, {
    startDate: expanded.startDate,
    endDate: expanded.endDate,
  });
}

export async function updateTripFlight(
  trip: Trip,
  flightKey: string,
  input: TripFlightInput
): Promise<void> {
  validateTripFlightInput(input);
  const { requiredStartDate, requiredEndDate } = flightInputDateRange(input);
  const expanded = expandTripDaysForOutsideRange(
    trip.days,
    trip.startDate,
    trip.endDate,
    requiredStartDate,
    requiredEndDate
  );
  const days = replaceTripFlightDays(expanded.days, flightKey, input);
  await updateTripDays(trip.id, days, {
    startDate: expanded.startDate,
    endDate: expanded.endDate,
  });
}

export async function deleteTripFlight(trip: Trip, flightKey: string): Promise<void> {
  const freshTrip = await getTrip(trip.id);
  if (!freshTrip) {
    throw new Error('Trip not found');
  }
  const days = removeFlightPairForAutoEntry(freshTrip.days, `${flightKey}_depart`);
  if (!days) {
    throw new Error('Flight not found');
  }
  await updateTripDays(freshTrip.id, days);
}

export async function deleteTripStayBlock(
  trip: Trip,
  block: TripStayBlockRecord
): Promise<void> {
  const freshTrip = await getTrip(trip.id);
  if (!freshTrip) {
    throw new Error('Trip not found');
  }
  const days = removeStayBlockDays(
    freshTrip.days,
    block.startDateKey,
    block.endDateKey
  );
  await updateTripDays(freshTrip.id, days);
}

export async function addTripStay(trip: Trip, input: TripStayInput): Promise<void> {
  const normalizedInput = normalizeTripStayInput(input);
  const freshTrip = await getTrip(trip.id);
  if (!freshTrip) {
    throw new Error('Trip not found');
  }
  validateTripStayInput(normalizedInput, freshTrip.startDate, freshTrip.endDate);
  const result = prepareStayBlockDaysForWrite(
    freshTrip.days,
    normalizedInput,
    freshTrip.startDate,
    freshTrip.endDate
  );
  await updateTripDays(freshTrip.id, result.days, {
    startDate: result.startDate,
    endDate: result.endDate,
  });
}

export async function updateTripStay(
  trip: Trip,
  previousBlock: TripStayBlockRecord,
  input: TripStayInput
): Promise<void> {
  const normalizedInput = normalizeTripStayInput(input);
  const freshTrip = await getTrip(trip.id);
  if (!freshTrip) {
    throw new Error('Trip not found');
  }
  validateTripStayInput(normalizedInput, freshTrip.startDate, freshTrip.endDate);
  const result = replaceStayBlockDays(
    freshTrip.days,
    {
      startDateKey: previousBlock.startDateKey,
      endDateKey: previousBlock.endDateKey,
    },
    normalizedInput,
    freshTrip.startDate,
    freshTrip.endDate
  );
  await updateTripDays(freshTrip.id, result.days, {
    startDate: result.startDate,
    endDate: result.endDate,
  });
}

function normalizeTripStayInput(input: TripStayInput): TripStayInput {
  const city =
    input.city === null || input.city === undefined
      ? null
      : validateLocation(input.city, 'City', MAX_ENTRY_LOCATION_LENGTH) ?? null;

  const stay = input.stay ? validateStay(input.stay) : undefined;

  return {
    ...input,
    city,
    stay,
  };
}

export async function deleteTripEntry(
  trip: Trip,
  dateKey: string,
  entryId: string
): Promise<void> {
  const freshTrip = await getTrip(trip.id);
  if (!freshTrip) {
    throw new Error('Trip not found');
  }

  const stayRemovalDays = removeStayBlockForAutoEntry(freshTrip.days, entryId);
  const flightRemovalDays =
    stayRemovalDays === null ? removeFlightPairForAutoEntry(freshTrip.days, entryId) : null;
  const days =
    stayRemovalDays ??
    flightRemovalDays ??
    freshTrip.days.map((day) =>
      day.date === dateKey
        ? { ...day, entries: day.entries.filter((entry) => entry.id !== entryId) }
        : day
    );

  await updateTripDays(freshTrip.id, days);
}

export async function deleteTrip(tripId: string, requesterId: string): Promise<void> {
  const trip = await getTrip(tripId);
  if (!trip) {
    throw new Error('Trip not found');
  }

  const group = await getGroup(trip.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  if (!canDeleteTrip(trip, group, requesterId)) {
    throw new Error('Only the trip creator, group owner, or an admin can delete this trip');
  }

  const { deleteTripLinkedExpenseGroup } = await import('./expenseGroups');
  await deleteTripLinkedExpenseGroup(trip);

  await deleteDoc(doc(db, 'trips', tripId));
}

export async function updateTripMembers(
  trip: Trip,
  memberIds: string[],
  requesterId: string
): Promise<void> {
  const group = await getGroup(trip.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  if (!canEditTrip(trip, group, requesterId)) {
    throw new Error('You do not have access to edit this trip');
  }

  const normalized = normalizeTripMemberIds(memberIds, group.members, trip.createdBy);
  if (normalized.length === 0) {
    throw new Error('Add at least one group member to this trip');
  }
  if (normalized.length > MAX_TRIP_MEMBERS) {
    throw new Error(`A trip can include up to ${MAX_TRIP_MEMBERS} members`);
  }

  await setDoc(
    doc(db, 'trips', trip.id),
    stripUndefined({
      memberIds: normalized,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );

  const { syncTripExpenseGroupMembers } = await import('./expenseGroups');
  await syncTripExpenseGroupMembers(
    { ...trip, memberIds: normalized },
    normalized,
    requesterId
  );
}

export async function updateTripDestination(
  tripId: string,
  destination: string
): Promise<void> {
  const normalized = normalizeDestination(destination);
  if (!isValidDestination(normalized)) {
    throw new Error('Enter a destination (at least 2 characters)');
  }

  await setDoc(
    doc(db, 'trips', tripId),
    {
      destination: normalized,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function updateTripDates(
  trip: Trip,
  startDate: string,
  endDate: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(trip.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  if (!canEditTrip(trip, group, requesterId)) {
    throw new Error('You do not have access to edit this trip');
  }
  if (!isValidTripDateRange(startDate, endDate)) {
    throw new Error('Choose a valid date range (up to 60 days)');
  }
  if (startDate === trip.startDate && endDate === trip.endDate) {
    return;
  }

  const days = resizeTripDayPlans(
    trip.days,
    trip.startDate,
    trip.endDate,
    startDate,
    endDate
  );
  await updateTripDays(trip.id, days, { startDate, endDate });
}
