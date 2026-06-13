import { useEffect, useMemo, useRef, useState } from 'react';
import { Group } from '../types';
import { Trip } from '../types/trips';
import { fetchGroupTripsOnce, subscribeToGroupTrips } from '../services/trips';
import { filterVisibleTrips } from '../utils/tripPermissions';

const EMPTY_TRIPS: Trip[] = [];

/**
 * Live trips for the active group only; one-shot cache for previously viewed groups.
 */
export function useGroupTrips(activeGroup: Group | undefined, userId: string | undefined) {
  const [trips, setTrips] = useState<Trip[]>(EMPTY_TRIPS);
  const [loading, setLoading] = useState(Boolean(activeGroup?.id));
  const cacheRef = useRef<Map<string, Trip[]>>(new Map());
  const activeGroupId = activeGroup?.id;
  const groupAccessKey = activeGroup
    ? `${activeGroup.id}|${activeGroup.ownerId}|${(activeGroup.adminIds ?? []).join(',')}|${activeGroup.members.join(',')}`
    : '';

  const visibleTrips = useMemo(() => {
    if (!activeGroup || !userId) return EMPTY_TRIPS;
    return filterVisibleTrips(trips, activeGroup, userId);
  }, [trips, groupAccessKey, userId, activeGroup]);

  useEffect(() => {
    if (!activeGroupId) {
      setTrips(EMPTY_TRIPS);
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(activeGroupId);
    if (cached) {
      setTrips(cached);
    } else {
      setLoading(true);
      void fetchGroupTripsOnce(activeGroupId)
        .then((fetched) => {
          cacheRef.current.set(activeGroupId, fetched);
          setTrips(fetched);
        })
        .finally(() => setLoading(false));
    }

    const unsubscribe = subscribeToGroupTrips(activeGroupId, (nextTrips) => {
      cacheRef.current.set(activeGroupId, nextTrips);
      setTrips(nextTrips);
      setLoading(false);
    });

    return unsubscribe;
  }, [activeGroupId]);

  return { trips: visibleTrips, loading };
}
