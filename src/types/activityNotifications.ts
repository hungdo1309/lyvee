import { PushNotificationData, PushNotificationType } from './pushNotifications';

export interface ActivityNotification {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  type: PushNotificationType;
  title: string;
  body: string;
  data: PushNotificationData;
  createdAt: string;
  readAt: string | null;
}

export interface CreateActivityNotificationInput {
  recipientIds: string[];
  actorId: string;
  actorName: string;
  type: PushNotificationType;
  title: string;
  body: string;
  data: PushNotificationData;
}
