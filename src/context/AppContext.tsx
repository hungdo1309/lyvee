import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { subscribeToUserGroups } from '../services/groups';
import { syncScheduleNotifications } from '../services/notifications';
import {
  fetchItemsForGroups,
  subscribeToGroupItems,
} from '../services/items';
import {
  fetchGroupTripsOnce,
  subscribeToGroupTrips,
} from '../services/trips';
import {
  fetchExpenseGroupsForGroups,
  subscribeToGroupExpenseGroups,
} from '../services/expenseGroups';
import {
  saveActiveGroupSession,
  clearActiveGroupSession,
  loadOnboardingComplete,
  saveOnboardingComplete,
} from '../services/session';
import { getGroupIdWithEarliestUpcoming } from '../utils/itemInstances';
import { filterVisibleTrips } from '../utils/tripPermissions';
import { useAuth } from './AuthContext';
import { Group, Item } from '../types';
import { Trip } from '../types/trips';
import { ExpenseGroup } from '../types/expenses';
import { filterVisibleExpenseGroups, canViewExpenseGroup } from '../utils/expensePermissions';

interface AppContextValue {
  groups: Group[];
  items: Item[];
  trips: Trip[];
  expenseGroups: ExpenseGroup[];
  activeGroup: Group | null;
  hasSelectedGroup: boolean;
  onboardingComplete: boolean;
  ready: boolean;
  setActiveGroupId: (id: string | null) => void;
  selectGroup: (groupId: string) => Promise<void>;
  clearGroupSelection: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  loading: boolean;
  getGroupItems: (groupId: string) => Item[];
  getGroupTrips: (groupId: string) => Trip[];
  getGroupExpenseGroups: (groupId: string) => ExpenseGroup[];
  getTripExpenseGroup: (tripId: string) => ExpenseGroup | null;
}

const AppContext = createContext<AppContextValue | null>(null);
const EMPTY_GROUP_ITEMS: Item[] = [];
const EMPTY_GROUP_TRIPS: Trip[] = [];
const EMPTY_GROUP_EXPENSE_GROUPS: ExpenseGroup[] = [];
const REMINDER_SYNC_DEBOUNCE_MS = 3000;

function mergeItemsFromCache(itemsByGroup: Map<string, Item[]>): Item[] {
  const merged: Item[] = [];
  for (const groupItems of itemsByGroup.values()) {
    merged.push(...groupItems);
  }
  return merged.sort((left, right) => {
    if (!left.dateTime && !right.dateTime) return 0;
    if (!left.dateTime) return 1;
    if (!right.dateTime) return -1;
    return left.dateTime.localeCompare(right.dateTime);
  });
}

function mergeTripsFromCache(tripsByGroup: Map<string, Trip[]>): Trip[] {
  const merged: Trip[] = [];
  for (const groupTrips of tripsByGroup.values()) {
    merged.push(...groupTrips);
  }
  return merged.sort((left, right) => left.startDate.localeCompare(right.startDate));
}

function mergeExpenseGroupsFromCache(expenseGroupsByGroup: Map<string, ExpenseGroup[]>): ExpenseGroup[] {
  const merged: ExpenseGroup[] = [];
  for (const groupExpenseGroups of expenseGroupsByGroup.values()) {
    merged.push(...groupExpenseGroups);
  }
  return merged.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [hasSelectedGroup, setHasSelectedGroup] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [itemsReady, setItemsReady] = useState(false);
  const userPickedGroupRef = useRef(false);
  const initialGroupAppliedRef = useRef(false);
  const itemsByGroupRef = useRef<Map<string, Item[]>>(new Map());
  const tripsByGroupRef = useRef<Map<string, Trip[]>>(new Map());
  const expenseGroupsByGroupRef = useRef<Map<string, ExpenseGroup[]>>(new Map());
  const groupsRef = useRef<Group[]>([]);
  const reminderSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupIdsKey = useMemo(
    () => groups.map((group) => group.id).sort().join(','),
    [groups]
  );

  const groupIds = useMemo(
    () => (groupIdsKey ? groupIdsKey.split(',') : []),
    [groupIdsKey]
  );

  const scheduleReminderSync = useCallback(() => {
    if (!user) return;
    if (reminderSyncTimeoutRef.current) {
      clearTimeout(reminderSyncTimeoutRef.current);
    }
    reminderSyncTimeoutRef.current = setTimeout(() => {
      void syncScheduleNotifications(
        mergeItemsFromCache(itemsByGroupRef.current),
        mergeTripsFromCache(tripsByGroupRef.current),
        groupsRef.current,
        user.id
      );
    }, REMINDER_SYNC_DEBOUNCE_MS);
  }, [user]);

  const publishItems = useCallback(
    (nextItems: Item[]) => {
      setItems(nextItems);
      scheduleReminderSync();
    },
    [scheduleReminderSync]
  );

  const publishTrips = useCallback(
    (nextTrips: Trip[]) => {
      setTrips(nextTrips);
      scheduleReminderSync();
    },
    [scheduleReminderSync]
  );

  const publishExpenseGroups = useCallback((nextExpenseGroups: ExpenseGroup[]) => {
    setExpenseGroups(nextExpenseGroups);
  }, []);

  const updateCachedGroupItems = useCallback(
    (groupId: string, groupItems: Item[]) => {
      itemsByGroupRef.current.set(groupId, groupItems);
      publishItems(mergeItemsFromCache(itemsByGroupRef.current));
    },
    [publishItems]
  );

  const updateCachedGroupTrips = useCallback(
    (groupId: string, groupTrips: Trip[]) => {
      tripsByGroupRef.current.set(groupId, groupTrips);
      publishTrips(mergeTripsFromCache(tripsByGroupRef.current));
    },
    [publishTrips]
  );

  const updateCachedGroupExpenseGroups = useCallback(
    (groupId: string, groupExpenseGroups: ExpenseGroup[]) => {
      expenseGroupsByGroupRef.current.set(groupId, groupExpenseGroups);
      publishExpenseGroups(mergeExpenseGroupsFromCache(expenseGroupsByGroupRef.current));
    },
    [publishExpenseGroups]
  );

  useEffect(() => {
    return () => {
      if (reminderSyncTimeoutRef.current) {
        clearTimeout(reminderSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setItems([]);
      setTrips([]);
      setExpenseGroups([]);
      setActiveGroupId(null);
      setHasSelectedGroup(false);
      setOnboardingComplete(false);
      setSessionLoaded(false);
      setGroupsLoaded(false);
      setItemsReady(false);
      itemsByGroupRef.current = new Map();
      tripsByGroupRef.current = new Map();
      expenseGroupsByGroupRef.current = new Map();
      groupsRef.current = [];
      userPickedGroupRef.current = false;
      initialGroupAppliedRef.current = false;
      return;
    }

    userPickedGroupRef.current = false;
    initialGroupAppliedRef.current = false;
    setSessionLoaded(false);
    setItemsReady(false);

    loadOnboardingComplete(user.id).then(async (onboardingDone) => {
      setOnboardingComplete(onboardingDone);
      setSessionLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !firebaseUser) return;

    setGroupsLoaded(false);
    const unsubGroups = subscribeToUserGroups(user.id, (fetched) => {
      groupsRef.current = fetched;
      setGroups(fetched);
      setGroupsLoaded(true);
    });

    return unsubGroups;
  }, [user, firebaseUser]);

  useEffect(() => {
    if (!user || !firebaseUser) return;

    if (groupIds.length === 0) {
      itemsByGroupRef.current = new Map();
      tripsByGroupRef.current = new Map();
      expenseGroupsByGroupRef.current = new Map();
      publishItems([]);
      publishTrips([]);
      publishExpenseGroups([]);
      setItemsReady(true);
      return;
    }

    let active = true;
    setItemsReady(false);

    Promise.all([
      fetchItemsForGroups(groupIds, user.id),
      fetchExpenseGroupsForGroups(groupIds, user.id),
    ])
      .then(([fetchedItemsByGroup, fetchedExpenseGroupsByGroup]) => {
        if (!active) return;
        itemsByGroupRef.current = fetchedItemsByGroup;
        expenseGroupsByGroupRef.current = fetchedExpenseGroupsByGroup;
        publishItems(mergeItemsFromCache(fetchedItemsByGroup));
        publishExpenseGroups(mergeExpenseGroupsFromCache(fetchedExpenseGroupsByGroup));
        setItemsReady(true);
      })
      .catch((error) => {
        console.warn('[AppContext] initial group data fetch:', error);
        if (active) {
          setItemsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [user, firebaseUser, groupIdsKey, publishItems, publishExpenseGroups]);

  useEffect(() => {
    if (!user || !firebaseUser || !activeGroupId) return;

    const unsub = subscribeToGroupExpenseGroups(activeGroupId, user.id, (groupExpenseGroups) => {
      updateCachedGroupExpenseGroups(activeGroupId, groupExpenseGroups);
    });

    return unsub;
  }, [user, firebaseUser, activeGroupId, updateCachedGroupExpenseGroups]);

  useEffect(() => {
    if (!user || !firebaseUser || !activeGroupId) return;

    let active = true;

    if (!tripsByGroupRef.current.has(activeGroupId)) {
      void fetchGroupTripsOnce(activeGroupId)
        .then((groupTrips) => {
          if (active) {
            updateCachedGroupTrips(activeGroupId, groupTrips);
          }
        })
        .catch((error) => {
          console.warn('[AppContext] initial trips fetch:', error);
        });
    }

    const unsub = subscribeToGroupTrips(activeGroupId, (groupTrips) => {
      updateCachedGroupTrips(activeGroupId, groupTrips);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [user, firebaseUser, activeGroupId, updateCachedGroupTrips]);

  useEffect(() => {
    if (!user || !firebaseUser || !activeGroupId) return;

    const unsub = subscribeToGroupItems(activeGroupId, user.id, (groupItems) => {
      updateCachedGroupItems(activeGroupId, groupItems);
    });

    return unsub;
  }, [user, firebaseUser, activeGroupId, updateCachedGroupItems]);

  useEffect(() => {
    if (!user || !sessionLoaded || !groupsLoaded || !itemsReady) return;

    if (groups.length === 0) {
      if (hasSelectedGroup || activeGroupId) {
        clearActiveGroupSession(user.id);
        setActiveGroupId(null);
        setHasSelectedGroup(false);
      }
      initialGroupAppliedRef.current = false;
      return;
    }

    const activeGroupStillValid =
      !!activeGroupId && groups.some((group) => group.id === activeGroupId);

    if (userPickedGroupRef.current && activeGroupStillValid) {
      return;
    }

    if (initialGroupAppliedRef.current && activeGroupStillValid) {
      return;
    }

    const defaultGroupId = getGroupIdWithEarliestUpcoming(groups, items);
    setActiveGroupId(defaultGroupId);
    setHasSelectedGroup(true);
    saveActiveGroupSession(user.id, defaultGroupId);
    initialGroupAppliedRef.current = true;
    userPickedGroupRef.current = false;
  }, [
    user,
    sessionLoaded,
    groupsLoaded,
    itemsReady,
    hasSelectedGroup,
    activeGroupId,
    groups,
    items,
  ]);

  const selectGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      userPickedGroupRef.current = true;
      setActiveGroupId(groupId);
      setHasSelectedGroup(true);
      await saveActiveGroupSession(user.id, groupId);
    },
    [user]
  );

  const clearGroupSelection = useCallback(async () => {
    if (!user) return;
    userPickedGroupRef.current = false;
    initialGroupAppliedRef.current = false;
    setActiveGroupId(null);
    setHasSelectedGroup(false);
    await clearActiveGroupSession(user.id);
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    await saveOnboardingComplete(user.id);
    setOnboardingComplete(true);
  }, [user]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  const itemsByGroup = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const groupItems = map.get(item.groupId);
      if (groupItems) {
        groupItems.push(item);
      } else {
        map.set(item.groupId, [item]);
      }
    }
    return map;
  }, [items]);

  const getGroupItems = useCallback(
    (groupId: string) => itemsByGroup.get(groupId) ?? EMPTY_GROUP_ITEMS,
    [itemsByGroup]
  );

  const tripsByGroup = useMemo(() => {
    const map = new Map<string, Trip[]>();
    for (const trip of trips) {
      const groupTrips = map.get(trip.groupId);
      if (groupTrips) {
        groupTrips.push(trip);
      } else {
        map.set(trip.groupId, [trip]);
      }
    }
    return map;
  }, [trips]);

  const getGroupTrips = useCallback(
    (groupId: string) => {
      const group = groups.find((entry) => entry.id === groupId);
      const groupTrips = tripsByGroup.get(groupId) ?? EMPTY_GROUP_TRIPS;
      if (!group || !user) return EMPTY_GROUP_TRIPS;
      return filterVisibleTrips(groupTrips, group, user.id);
    },
    [tripsByGroup, groups, user]
  );

  const expenseGroupsByGroup = useMemo(() => {
    const map = new Map<string, ExpenseGroup[]>();
    for (const expenseGroup of expenseGroups) {
      const groupExpenseGroups = map.get(expenseGroup.groupId);
      if (groupExpenseGroups) {
        groupExpenseGroups.push(expenseGroup);
      } else {
        map.set(expenseGroup.groupId, [expenseGroup]);
      }
    }
    return map;
  }, [expenseGroups]);

  const getGroupExpenseGroups = useCallback(
    (groupId: string) => {
      const group = groups.find((entry) => entry.id === groupId);
      const groupExpenseGroups = expenseGroupsByGroup.get(groupId) ?? EMPTY_GROUP_EXPENSE_GROUPS;
      const groupTrips = tripsByGroup.get(groupId) ?? EMPTY_GROUP_TRIPS;
      if (!group || !user) return EMPTY_GROUP_EXPENSE_GROUPS;
      return filterVisibleExpenseGroups(groupExpenseGroups, group, user.id, groupTrips);
    },
    [expenseGroupsByGroup, tripsByGroup, groups, user]
  );

  const getTripExpenseGroup = useCallback(
    (tripId: string) => {
      const trip = trips.find((candidate) => candidate.id === tripId);
      const entry =
        expenseGroups.find((groupExpenseGroup) => groupExpenseGroup.tripId === tripId) ??
        (trip?.expenseGroupId
          ? expenseGroups.find(
              (groupExpenseGroup) => groupExpenseGroup.id === trip.expenseGroupId
            )
          : null);
      if (!entry || !user) return null;
      const group = groups.find((candidate) => candidate.id === entry.groupId);
      const resolvedTrip = trip ?? trips.find((candidate) => candidate.id === tripId);
      if (!group || !resolvedTrip) return null;
      if (!canViewExpenseGroup(entry, group, user.id, resolvedTrip)) return null;
      return entry;
    },
    [expenseGroups, groups, trips, user]
  );

  const ready = sessionLoaded && groupsLoaded && itemsReady;
  const loading = !ready && !!user;

  const contextValue = useMemo(
    () => ({
      groups,
      items,
      trips,
      expenseGroups,
      activeGroup,
      hasSelectedGroup,
      onboardingComplete,
      ready,
      setActiveGroupId,
      selectGroup,
      clearGroupSelection,
      completeOnboarding,
      loading,
      getGroupItems,
      getGroupTrips,
      getGroupExpenseGroups,
      getTripExpenseGroup,
    }),
    [
      groups,
      items,
      trips,
      expenseGroups,
      activeGroup,
      hasSelectedGroup,
      onboardingComplete,
      ready,
      selectGroup,
      clearGroupSelection,
      completeOnboarding,
      loading,
      getGroupItems,
      getGroupTrips,
      getGroupExpenseGroups,
      getTripExpenseGroup,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
