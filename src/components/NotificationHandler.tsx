import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { ReminderPayload } from '../services/notifications';
import { PushNotificationData } from '../types/pushNotifications';

function navigateToItem(itemId: string, occurrence?: string) {
  router.push({
    pathname: '/(app)/item/[id]',
    params: {
      id: itemId,
      ...(occurrence ? { occurrence } : {}),
    },
  });
}

function navigateToGroup(groupId: string) {
  router.push({
    pathname: '/(app)/(tabs)/groups/[id]',
    params: { id: groupId },
  } as Href);
}

function openFromPushData(data: Partial<ReminderPayload & PushNotificationData>) {
  if (data.itemId) {
    navigateToItem(data.itemId, data.occurrence);
    return;
  }

  if (data.groupId && data.type?.startsWith('group.')) {
    navigateToGroup(data.groupId);
  }
}

export function NotificationHandler() {
  useEffect(() => {
    const openFromResponse = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;
      openFromPushData(
        response.notification.request.content.data as Partial<
          ReminderPayload & PushNotificationData
        >
      );
    };

    Notifications.getLastNotificationResponseAsync().then(openFromResponse);

    const subscription =
      Notifications.addNotificationResponseReceivedListener(openFromResponse);

    return () => subscription.remove();
  }, []);

  return null;
}
