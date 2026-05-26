import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PushEventInput } from '../types/pushNotifications';
import { excludeActor } from '../utils/pushRecipients';
import { getUserProfile } from './auth';

export async function enqueuePushEvent(input: PushEventInput): Promise<void> {
  const recipientIds = excludeActor(input.actorId, input.recipientIds);
  if (recipientIds.length === 0) return;

  try {
    const actor = await getUserProfile(input.actorId);
    await addDoc(collection(db, 'pushEvents'), {
      type: input.type,
      actorId: input.actorId,
      actorName: actor?.name ?? 'Someone',
      recipientIds,
      title: input.title,
      body: input.body,
      data: input.data ?? { type: input.type },
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
  } catch (error) {
    console.warn('[push] enqueuePushEvent failed:', error);
  }
}
