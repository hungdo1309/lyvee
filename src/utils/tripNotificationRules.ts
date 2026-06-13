import { Group } from '../types';
import { Trip } from '../types/trips';
import { canViewTrip } from './tripPermissions';

export function shouldNotifyUserForTrip(
  trip: Trip,
  group: Group | undefined,
  userId: string
): boolean {
  return canViewTrip(trip, group, userId);
}

export function getTripsForNotification(
  trips: Trip[],
  groups: Group[],
  userId: string
): Trip[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  return trips.filter((trip) =>
    shouldNotifyUserForTrip(trip, groupById.get(trip.groupId), userId)
  );
}
