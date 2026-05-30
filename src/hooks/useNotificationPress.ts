import { useCallback } from 'react';
import { ActivityNotification } from '../types/activityNotifications';
import { markActivityNotificationRead } from '../services/activityNotifications';
import { navigateFromNotificationData } from '../utils/notificationNavigation';

export function useNotificationPress(
  userId: string | undefined,
  onBeforeNavigate?: () => void
) {
  return useCallback(
    async (notification: ActivityNotification) => {
      if (userId && !notification.readAt) {
        try {
          await markActivityNotificationRead(userId, notification.id);
        } catch (error) {
          console.warn('[useNotificationPress] markActivityNotificationRead:', error);
        }
      }

      onBeforeNavigate?.();
      navigateFromNotificationData(notification.data);
    },
    [onBeforeNavigate, userId]
  );
}
