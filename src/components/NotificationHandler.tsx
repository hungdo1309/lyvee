import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { markActivityNotificationReadFromPush } from '../services/activityNotifications';
import { ReminderPayload } from '../services/notifications';
import { PushNotificationData } from '../types/pushNotifications';
import { navigateFromNotificationData } from '../utils/notificationNavigation';

function isActivityPushData(
  data: Partial<ReminderPayload & PushNotificationData>
): data is PushNotificationData {
  return typeof data.type === 'string' && !data.type.startsWith('reminder.');
}

export function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const openFromResponse = async (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;

      const data = response.notification.request.content.data as Partial<
        ReminderPayload & PushNotificationData
      >;

      if (isActivityPushData(data)) {
        try {
          await markActivityNotificationReadFromPush(user.id, data);
        } catch (error) {
          console.warn('[NotificationHandler] markActivityNotificationReadFromPush:', error);
        }
        navigateFromNotificationData(data);
        return;
      }

      if (data.itemId) {
        navigateFromNotificationData({
          type: 'item.updated',
          itemId: data.itemId,
          groupId: data.groupId,
          occurrence: data.occurrence,
        });
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      void openFromResponse(response);
    });

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void openFromResponse(response);
      });

    return () => subscription.remove();
  }, [user]);

  return null;
}
