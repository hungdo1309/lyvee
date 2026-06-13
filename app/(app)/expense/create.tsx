import React, { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { createTripExpenseGroup } from '../../../src/services/expenseGroups';
import { appAlert } from '../../../src/utils/dialog';

/** Trip-linked expense groups are created from a trip. Everything else uses the auto Group Expense. */
export default function CreateExpenseGroupScreen() {
  const { user } = useAuth();
  const { groups, getGroupTrips, getTripExpenseGroup } = useApp();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const [started, setStarted] = useState(false);

  const linkedTrip = useMemo(() => {
    if (!tripId || typeof tripId !== 'string') return null;
    for (const group of groups) {
      const trip = getGroupTrips(group.id).find((entry) => entry.id === tripId);
      if (trip) return trip;
    }
    return null;
  }, [tripId, groups, getGroupTrips]);

  useEffect(() => {
    if (!tripId || typeof tripId !== 'string') {
      router.replace('/(app)/(tabs)/expenses' as Href);
      return;
    }

    const existing = getTripExpenseGroup(tripId);
    if (existing) {
      router.replace(`/(app)/expense/${existing.id}?from=trip` as Href);
      return;
    }

    if (!user || !linkedTrip || started) return;

    setStarted(true);
    createTripExpenseGroup(user.id, linkedTrip)
      .then((expenseGroupId) => {
        router.replace(`/(app)/expense/${expenseGroupId}?from=trip` as Href);
      })
      .catch((error) => {
        appAlert(
          'Error',
          error instanceof Error ? error.message : 'Could not create trip expenses'
        );
        router.back();
      });
  }, [tripId, getTripExpenseGroup, user, linkedTrip, started]);

  return <LoadingScreen />;
}
