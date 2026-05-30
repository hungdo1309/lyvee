import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  deleteExpiredActivityNotifications,
  subscribeToActivityNotifications,
} from '../services/activityNotifications';
import { ActivityNotification } from '../types/activityNotifications';
import { POPOVER_NOTIFICATION_LIMIT } from '../constants/notifications';
import { useAuth } from './AuthContext';

interface ActivityNotificationsContextValue {
  notifications: ActivityNotification[];
  popoverNotifications: ActivityNotification[];
  unreadCount: number;
  loading: boolean;
}

const ActivityNotificationsContext =
  createContext<ActivityNotificationsContextValue | null>(null);

const EMPTY_NOTIFICATIONS: ActivityNotification[] = [];
const cleanupCompletedForUser = new Set<string>();

function getNotificationsSignature(notifications: ActivityNotification[]): string {
  return notifications.map((notification) => `${notification.id}:${notification.readAt ?? ''}`).join('|');
}

export function ActivityNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<ActivityNotification[]>(EMPTY_NOTIFICATIONS);
  const [loading, setLoading] = useState(Boolean(userId));
  const signatureRef = useRef('');

  useEffect(() => {
    if (!userId) {
      signatureRef.current = '';
      setNotifications(EMPTY_NOTIFICATIONS);
      setLoading(false);
      return;
    }

    setLoading(true);
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

    const unsubscribe = subscribeToActivityNotifications(userId, (next) => {
      if (!active) return;

      const signature = getNotificationsSignature(next);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setNotifications(next);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      signatureRef.current = '';
      unsubscribe();
    };
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  const popoverNotifications = useMemo(
    () => notifications.slice(0, POPOVER_NOTIFICATION_LIMIT),
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      popoverNotifications,
      unreadCount,
      loading,
    }),
    [loading, notifications, popoverNotifications, unreadCount]
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
