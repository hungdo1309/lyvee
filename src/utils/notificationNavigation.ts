import { router, type Href } from 'expo-router';
import { PushNotificationData } from '../types/pushNotifications';

export function navigateFromNotificationData(data: PushNotificationData): void {
  if (data.type === 'item.deleted' && data.groupId) {
    router.push({
      pathname: '/(app)/group/[groupId]/items',
      params: { groupId: data.groupId },
    });
    return;
  }

  if (data.type === 'group.deleted') {
    router.push('/(app)/(tabs)/groups' as Href);
    return;
  }

  if (data.type === 'expense.group.deleted' && data.tripId) {
    router.push(`/(app)/trip/${data.tripId}` as Href);
    return;
  }

  if (data.expenseGroupId) {
    router.push(`/(app)/expense/${data.expenseGroupId}` as Href);
    return;
  }

  if (data.tripId) {
    router.push({
      pathname: '/(app)/trip/[id]',
      params: {
        id: data.tripId,
        ...(data.dateKey ? { date: data.dateKey } : {}),
        ...(data.entryId ? { entryId: data.entryId } : {}),
      },
    });
    return;
  }

  if (data.itemId) {
    router.push({
      pathname: '/(app)/item/[id]',
      params: {
        id: data.itemId,
        ...(data.occurrence ? { occurrence: data.occurrence } : {}),
        ...(data.commentId ? { commentId: data.commentId } : {}),
      },
    });
    return;
  }

  if (data.groupId && data.type?.startsWith('group.')) {
    router.push({
      pathname: '/(app)/(tabs)/groups/[id]',
      params: { id: data.groupId },
    } as Href);
  }
}
