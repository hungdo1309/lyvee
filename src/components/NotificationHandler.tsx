import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ReminderPayload } from '../services/notifications';

function navigateToItem(data: ReminderPayload) {
  router.push({
    pathname: '/(app)/item/[id]',
    params: {
      id: data.itemId,
      occurrence: data.occurrence,
    },
  });
}

export function NotificationHandler() {
  useEffect(() => {
    const openFromResponse = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;
      const data = response.notification.request.content.data as Partial<ReminderPayload>;
      if (data?.itemId) {
        navigateToItem({
          itemId: data.itemId,
          groupId: data.groupId ?? '',
          occurrence: data.occurrence ?? '',
          reminder: data.reminder ?? '1h',
        });
      }
    };

    Notifications.getLastNotificationResponseAsync().then(openFromResponse);

    const subscription =
      Notifications.addNotificationResponseReceivedListener(openFromResponse);

    return () => subscription.remove();
  }, []);

  return null;
}
