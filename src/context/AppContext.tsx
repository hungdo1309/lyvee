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
import { backfillVisibleToForGroup, createAllUserItemsSubscription } from '../services/items';
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
  const itemsSubscriptionRef = useRef<ReturnType<
    typeof createAllUserItemsSubscription
  > | null>(null);
  const visibleToBackfillRef = useRef<Set<string>>(new Set());

  const groupIdsKey = useMemo(
    () => groups.map((group) => group.id).sort().join(','),
    [groups]
  );

  const groupIds = useMemo(
    () => (groupIdsKey ? groupIdsKey.split(',') : []),
    [groupIdsKey]
  );

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
      userPickedGroupRef.current = false;
      initialGroupAppliedRef.current = false;
      visibleToBackfillRef.current.clear();
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
    if (!user || !firebaseUser || groups.length === 0) return;

    for (const group of groups) {
      if (visibleToBackfillRef.current.has(group.id)) continue;
      visibleToBackfillRef.current.add(group.id);
      backfillVisibleToForGroup(group.id, group.members).catch((error) => {
        visibleToBackfillRef.current.delete(group.id);
        console.warn('[items] visibleTo backfill failed:', error);
      });
    }
  }, [user, firebaseUser, groupIdsKey]);

  useEffect(() => {
    if (!user || !firebaseUser) {
      itemsSubscriptionRef.current?.destroy();
      itemsSubscriptionRef.current = null;
      return;
    }

    const subscription = createAllUserItemsSubscription(user.id, (fetched) => {
      setItems(fetched);
      setItemsReady(true);
      syncItemNotifications(fetched, user.id);
    });
    itemsSubscriptionRef.current = subscription;

    return () => {
      subscription.destroy();
      itemsSubscriptionRef.current = null;
    };
  }, [user, firebaseUser]);

  useEffect(() => {
    if (!user || !firebaseUser) return;

    const subscription = itemsSubscriptionRef.current;
    if (!subscription) return;

    if (groupIds.length === 0) {
      subscription.setGroupIds([]);
      setItems([]);
      setItemsReady(true);
      return;
    }

    setItemsReady(false);
    subscription.setGroupIds(groupIds);
  }, [user, firebaseUser, groupIdsKey]);

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

  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? null;

  const getGroupItems = useCallback(
    (groupId: string) => items.filter((item) => item.groupId === groupId),
    [items]
  );

  const ready = sessionLoaded && groupsLoaded && itemsReady;
  const loading = !ready && !!user;

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
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
