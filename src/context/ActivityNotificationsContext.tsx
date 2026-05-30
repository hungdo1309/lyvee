import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  deleteExpiredActivityNotifications,
  fetchActivityNotificationsPage,
  subscribeToActivityNotifications,
} from '../services/activityNotifications';
import { ActivityNotification } from '../types/activityNotifications';
import {
  NOTIFICATION_PAGE_SIZE,
  POPOVER_NOTIFICATION_LIMIT,
} from '../constants/notifications';
import { useAuth } from './AuthContext';

interface ActivityNotificationsContextValue {
  notifications: ActivityNotification[];
  popoverNotifications: ActivityNotification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
}

const ActivityNotificationsContext =
  createContext<ActivityNotificationsContextValue | null>(null);

const EMPTY_NOTIFICATIONS: ActivityNotification[] = [];
const cleanupCompletedForUser = new Set<string>();

function getNotificationsSignature(notifications: ActivityNotification[]): string {
  return notifications
    .map((notification) => `${notification.id}:${notification.readAt ?? ''}`)
    .join('|');
}

function mergeNotificationLists(
  liveNotifications: ActivityNotification[],
  olderNotifications: ActivityNotification[]
): ActivityNotification[] {
  if (olderNotifications.length === 0) return liveNotifications;

  const liveIds = new Set(liveNotifications.map((notification) => notification.id));
  const mergedOlder = olderNotifications.filter(
    (notification) => !liveIds.has(notification.id)
  );

  return [...liveNotifications, ...mergedOlder];
}

export function ActivityNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const [liveNotifications, setLiveNotifications] =
    useState<ActivityNotification[]>(EMPTY_NOTIFICATIONS);
  const [olderNotifications, setOlderNotifications] =
    useState<ActivityNotification[]>(EMPTY_NOTIFICATIONS);
  const [loading, setLoading] = useState(Boolean(userId));
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const signatureRef = useRef('');
  const historyCursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const paginatedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      signatureRef.current = '';
      historyCursorRef.current = null;
      paginatedRef.current = false;
      setLiveNotifications(EMPTY_NOTIFICATIONS);
      setOlderNotifications(EMPTY_NOTIFICATIONS);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    paginatedRef.current = false;
    historyCursorRef.current = null;
    setOlderNotifications(EMPTY_NOTIFICATIONS);
    let active = true;

    if (!cleanupCompletedForUser.has(userId)) {
      cleanupCompletedForUser.add(userId);
      void deleteExpiredActivityNotifications(userId).catch((error) => {
        console.warn(
          '[ActivityNotificationsProvider] deleteExpiredActivityNotifications:',
          error
        );
      });
    }

    const unsubscribe = subscribeToActivityNotifications(userId, (snapshot) => {
      if (!active) return;

      const signature = getNotificationsSignature(snapshot.notifications);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setLiveNotifications(snapshot.notifications);
      }

      if (!paginatedRef.current) {
        historyCursorRef.current = snapshot.lastDoc;
        setHasMore(snapshot.hasMore);
      }

      setLoading(false);
    });

    return () => {
      active = false;
      signatureRef.current = '';
      historyCursorRef.current = null;
      paginatedRef.current = false;
      unsubscribe();
    };
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || !historyCursorRef.current) return;

    setLoadingMore(true);
    paginatedRef.current = true;

    try {
      const page = await fetchActivityNotificationsPage(
        userId,
        NOTIFICATION_PAGE_SIZE,
        historyCursorRef.current
      );

      historyCursorRef.current = page.lastDoc;
      setHasMore(page.hasMore);

      const liveIds = new Set(liveNotifications.map((notification) => notification.id));
      setOlderNotifications((current) => {
        const existingIds = new Set(current.map((notification) => notification.id));
        const next = page.notifications.filter(
          (notification) =>
            !liveIds.has(notification.id) && !existingIds.has(notification.id)
        );
        return next.length > 0 ? [...current, ...next] : current;
      });
    } catch (error) {
      console.warn('[ActivityNotificationsProvider] loadMore:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, liveNotifications, loadingMore, userId]);

  const notifications = useMemo(
    () => mergeNotificationLists(liveNotifications, olderNotifications),
    [liveNotifications, olderNotifications]
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  const popoverNotifications = useMemo(
    () => liveNotifications.slice(0, POPOVER_NOTIFICATION_LIMIT),
    [liveNotifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      popoverNotifications,
      unreadCount,
      loading,
      hasMore,
      loadingMore,
      loadMore,
    }),
    [
      hasMore,
      loadMore,
      loading,
      loadingMore,
      notifications,
      popoverNotifications,
      unreadCount,
    ]
  );

  return (
    <ActivityNotificationsContext.Provider value={value}>
      {children}
    </ActivityNotificationsContext.Provider>
  );
}

export function useActivityNotifications(): ActivityNotificationsContextValue {
  const context = useContext(ActivityNotificationsContext);
  if (!context) {
    throw new Error('useActivityNotifications must be used within ActivityNotificationsProvider');
  }
  return context;
}
