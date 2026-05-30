import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PushEventInput } from '../types/pushNotifications';
import { excludeActor } from '../utils/pushRecipients';
import { collectPushTokensFromUsers } from '../utils/pushTokens';
import { createActivityNotificationsForRecipients } from './activityNotifications';
import { getUserProfile, getUsersByIds } from './auth';

export async function enqueuePushEvent(input: PushEventInput): Promise<void> {
  const recipientIds = excludeActor(input.actorId, input.recipientIds);
  if (recipientIds.length === 0) return;

  try {
    const actorName =
      input.actorName ??
      (await getUserProfile(input.actorId))?.name ??
      'Someone';
    const data = input.data ?? { type: input.type };

    const notificationIds = await createActivityNotificationsForRecipients({
      recipientIds,
      actorId: input.actorId,
      actorName,
      type: input.type,
      title: input.title,
      body: input.body,
      data,
    });

    const recipients = await getUsersByIds(recipientIds);
    const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        const recipient = recipientsById.get(recipientId);
        const pushTokens = recipient ? collectPushTokensFromUsers([recipient]) : [];
        if (pushTokens.length === 0) return;

        await addDoc(collection(db, 'pushEvents'), {
          type: input.type,
          actorId: input.actorId,
          actorName,
          recipientIds: [recipientId],
          pushTokens,
          title: input.title,
          body: input.body,
          data: {
            ...data,
            notificationId: notificationIds[recipientId],
          },
          createdAt: new Date().toISOString(),
          status: 'pending',
        });
      })
    );
  } catch (error) {
    console.warn('[push] enqueuePushEvent failed:', error);
  }
}
