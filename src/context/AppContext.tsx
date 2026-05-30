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
import {
  fetchItemsForGroups,
  subscribeToGroupItems,
} from '../services/items';
import { syncItemNotifications } from '../services/notifications';
import {
  saveActiveGroupSession,
  clearActiveGroupSession,
  loadOnboardingComplete,
  saveOnboardingComplete,
} from '../services/session';
import { getGroupIdWithEarliestUpcoming } from '../utils/itemInstances';
import { useAuth } from './AuthContext';
import { Group, Item } from '../types';

interface AppContextValue {
  groups: Group[];
  items: Item[];
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
}

const AppContext = createContext<AppContextValue | null>(null);
const EMPTY_GROUP_ITEMS: Item[] = [];
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [hasSelectedGroup, setHasSelectedGroup] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [itemsReady, setItemsReady] = useState(false);
  const userPickedGroupRef = useRef(false);
  const initialGroupAppliedRef = useRef(false);
  const itemsByGroupRef = useRef<Map<string, Item[]>>(new Map());
  const reminderSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupIdsKey = useMemo(
    () => groups.map((group) => group.id).sort().join(','),
    [groups]
  );

  const groupIds = useMemo(
    () => (groupIdsKey ? groupIdsKey.split(',') : []),
    [groupIdsKey]
  );

  const publishItems = useCallback(
    (nextItems: Item[]) => {
      setItems(nextItems);

      if (!user) return;
      if (reminderSyncTimeoutRef.current) {
        clearTimeout(reminderSyncTimeoutRef.current);
      }
      reminderSyncTimeoutRef.current = setTimeout(() => {
        void syncItemNotifications(nextItems, user.id);
      }, REMINDER_SYNC_DEBOUNCE_MS);
    },
    [user]
  );

  const updateCachedGroupItems = useCallback(
    (groupId: string, groupItems: Item[]) => {
      itemsByGroupRef.current.set(groupId, groupItems);
      publishItems(mergeItemsFromCache(itemsByGroupRef.current));
    },
    [publishItems]
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
      setActiveGroupId(null);
      setHasSelectedGroup(false);
      setOnboardingComplete(false);
      setSessionLoaded(false);
      setGroupsLoaded(false);
      setItemsReady(false);
      itemsByGroupRef.current = new Map();
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
      setGroups(fetched);
      setGroupsLoaded(true);
    });

    return unsubGroups;
  }, [user, firebaseUser]);

  useEffect(() => {
    if (!user || !firebaseUser) return;

    if (groupIds.length === 0) {
      itemsByGroupRef.current = new Map();
      publishItems([]);
      setItemsReady(true);
      return;
    }

    let active = true;
    setItemsReady(false);

    fetchItemsForGroups(groupIds, user.id)
      .then((fetchedByGroup) => {
        if (!active) return;
        itemsByGroupRef.current = fetchedByGroup;
        publishItems(mergeItemsFromCache(fetchedByGroup));
        setItemsReady(true);
      })
      .catch((error) => {
        console.warn('[AppContext] fetchItemsForGroups:', error);
        if (active) {
          setItemsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [user, firebaseUser, groupIdsKey, publishItems]);

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

  const ready = sessionLoaded && groupsLoaded && itemsReady;
  const loading = !ready && !!user;

  const contextValue = useMemo(
    () => ({
      groups,
      items,
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
    }),
    [
      groups,
      items,
      activeGroup,
      hasSelectedGroup,
      onboardingComplete,
      ready,
      selectGroup,
      clearGroupSelection,
      completeOnboarding,
      loading,
      getGroupItems,
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
