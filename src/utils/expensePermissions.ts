import { Group } from '../types';
import { ExpenseGroup } from '../types/expenses';
import { Trip } from '../types/trips';
import { canManageGroup } from './groupRoles';
import { canViewTrip } from './tripPermissions';

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function normalizeExpenseMemberIds(
  memberIds: string[],
  groupMembers: string[],
  creatorId: string
): string[] {
  const validMembers = new Set(groupMembers);
  return uniqueIds([creatorId, ...memberIds.filter((id) => validMembers.has(id))]);
}

/** Trip memberIds empty means all group members are on the trip. */
export function resolveTripExpenseMemberIds(
  trip: Pick<Trip, 'memberIds' | 'createdBy'>,
  groupMembers: string[]
): string[] {
  const sourceIds = trip.memberIds.length > 0 ? trip.memberIds : groupMembers;
  return normalizeExpenseMemberIds(sourceIds, groupMembers, trip.createdBy);
}

/** Trip members, trip creator, and group owner/admin. */
export function isTripMember(
  trip: Pick<Trip, 'memberIds' | 'createdBy'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  return canViewTrip(trip, group, userId);
}

export function canManageTripExpenseGroup(
  trip: Pick<Trip, 'createdBy'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  if (trip.createdBy === userId) return true;
  return Boolean(group && canManageGroup(group, userId));
}

/** Trip creator or group owner/admin — controls the "+ Trip Expenses" button only. */
export function canCreateTripExpenseGroup(
  trip: Pick<Trip, 'createdBy' | 'memberIds'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  return canManageTripExpenseGroup(trip, group, userId);
}

export function canViewTripExpenses(
  trip: Pick<Trip, 'memberIds' | 'createdBy'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  return isTripMember(trip, group, userId);
}

export function canViewExpenseGroup(
  expenseGroup: Pick<ExpenseGroup, 'memberIds' | 'tripId' | 'isDefault'>,
  group: Group | null | undefined,
  userId: string,
  trip?: Pick<Trip, 'memberIds' | 'createdBy'> | null
): boolean {
  if (!group?.members.includes(userId)) return false;

  if (expenseGroup.isDefault) {
    return expenseGroup.memberIds.includes(userId);
  }

  if (expenseGroup.tripId) {
    if (!trip) return false;
    return isTripMember(trip, group, userId);
  }

  if (canManageGroup(group, userId)) return true;
  return expenseGroup.memberIds.includes(userId);
}

export function canEditExpenseGroup(
  expenseGroup: Pick<ExpenseGroup, 'memberIds' | 'tripId' | 'isDefault'>,
  group: Group | null | undefined,
  userId: string,
  trip?: Pick<Trip, 'memberIds' | 'createdBy'> | null
): boolean {
  return canViewExpenseGroup(expenseGroup, group, userId, trip);
}

export function canDeleteExpenseGroup(
  expenseGroup: Pick<ExpenseGroup, 'isDefault' | 'tripId'>,
  group: Group | null | undefined,
  userId: string,
  trip?: Pick<Trip, 'createdBy'> | null
): boolean {
  if (expenseGroup.isDefault) return false;

  if (expenseGroup.tripId) {
    if (!trip) return false;
    return canManageTripExpenseGroup(trip, group, userId);
  }

  return Boolean(group && canManageGroup(group, userId));
}

export function filterVisibleExpenseGroups(
  expenseGroups: ExpenseGroup[],
  group: Group,
  userId: string,
  trips: Trip[] = []
): ExpenseGroup[] {
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  return expenseGroups.filter((entry) =>
    canViewExpenseGroup(
      entry,
      group,
      userId,
      entry.tripId ? tripById.get(entry.tripId) : null
    )
  );
}
