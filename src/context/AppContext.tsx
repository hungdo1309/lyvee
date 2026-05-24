import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { subscribeToUserGroups } from '../services/groups';
import { subscribeToAllUserItems } from '../services/items';
import { syncItemNotifications } from '../services/notifications';
import {
  loadActiveGroupSession,
  saveActiveGroupSession,
  clearActiveGroupSession,
  loadOnboardingComplete,
  saveOnboardingComplete,
} from '../services/session';
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

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setItems([]);
      setActiveGroupId(null);
      setHasSelectedGroup(false);
      setOnboardingComplete(false);
      setSessionLoaded(false);
      setGroupsLoaded(false);
      return;
    }

    setSessionLoaded(false);
    Promise.all([
      loadActiveGroupSession(user.id),
      loadOnboardingComplete(user.id),
    ]).then(async ([savedGroupId, onboardingDone]) => {
      if (savedGroupId) {
        setActiveGroupId(savedGroupId);
        setHasSelectedGroup(true);
      }
      let complete = onboardingDone;
      if (savedGroupId && !onboardingDone) {
        await saveOnboardingComplete(user.id);
        complete = true;
      }
      setOnboardingComplete(complete);
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
    if (!user || !sessionLoaded || !groupsLoaded) return;

    const activeGroupValid =
      hasSelectedGroup &&
      activeGroupId &&
      groups.some((group) => group.id === activeGroupId);

    if (activeGroupValid) return;

    if (groups.length === 0) {
      if (hasSelectedGroup || activeGroupId) {
        clearActiveGroupSession(user.id);
        setActiveGroupId(null);
        setHasSelectedGroup(false);
      }
      return;
    }

    const defaultGroupId = groups[0].id;
    setActiveGroupId(defaultGroupId);
    setHasSelectedGroup(true);
    saveActiveGroupSession(user.id, defaultGroupId);
  }, [
    user,
    sessionLoaded,
    groupsLoaded,
    hasSelectedGroup,
    activeGroupId,
    groups,
  ]);

  useEffect(() => {
    if (!user || !firebaseUser || groups.length === 0) {
      setItems([]);
      return;
    }

    const groupIds = groups.map((g) => g.id);
    const unsubItems = subscribeToAllUserItems(groupIds, user.id, (fetched) => {
      setItems(fetched);
      syncItemNotifications(fetched, user.id);
    });

    return unsubItems;
  }, [user, firebaseUser, groups]);

  const selectGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      setActiveGroupId(groupId);
      setHasSelectedGroup(true);
      await saveActiveGroupSession(user.id, groupId);
    },
    [user]
  );

  const clearGroupSelection = useCallback(async () => {
    if (!user) return;
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
    groups.find((g) => g.id === activeGroupId) ?? null;

  const getGroupItems = useCallback(
    (groupId: string) => items.filter((item) => item.groupId === groupId),
    [items]
  );

  const ready = sessionLoaded && groupsLoaded;
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
