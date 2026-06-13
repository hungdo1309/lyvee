import { Group } from '../types';
import { Trip } from '../types/trips';
import { canManageGroup } from './groupRoles';

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function normalizeTripMemberIds(
  memberIds: string[],
  groupMembers: string[],
  creatorId: string
): string[] {
  const validMembers = new Set(groupMembers);
  return uniqueIds([creatorId, ...memberIds.filter((id) => validMembers.has(id))]);
}

export function canViewTrip(
  trip: Pick<Trip, 'memberIds' | 'createdBy'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  if (!group?.members.includes(userId)) return false;
  if (trip.createdBy === userId) return true;
  if (canManageGroup(group, userId)) return true;
  if (trip.memberIds.length === 0) return true;
  return trip.memberIds.includes(userId);
}

export function canEditTrip(
  trip: Pick<Trip, 'memberIds' | 'createdBy'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  return canViewTrip(trip, group, userId);
}

export function canDeleteTrip(
  trip: Pick<Trip, 'createdBy'>,
  group: Group | null | undefined,
  userId: string
): boolean {
  if (trip.createdBy === userId) return true;
  return Boolean(group && canManageGroup(group, userId));
}

export function filterVisibleTrips(trips: Trip[], group: Group, userId: string): Trip[] {
  return trips.filter((trip) => canViewTrip(trip, group, userId));
}
