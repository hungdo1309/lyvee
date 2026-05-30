import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  getNotificationRetentionCutoffIso,
  NOTIFICATION_RETENTION_DAYS,
  NOTIFICATION_SYNC_LIMIT,
} from '../constants/notifications';
import {
  ActivityNotification,
  CreateActivityNotificationInput,
} from '../types/activityNotifications';
import { PushNotificationData } from '../types/pushNotifications';

export { POPOVER_NOTIFICATION_LIMIT } from '../constants/notifications';

const MARK_READ_SCAN_LIMIT = 50;
const FIRESTORE_BATCH_LIMIT = 500;

function notificationsCollection(userId: string) {
  return collection(db, 'users', userId, 'notifications');
}

function mapNotification(id: string, data: Record<string, unknown>): ActivityNotification {
  return {
    id,
    userId: String(data.userId ?? ''),
    actorId: String(data.actorId ?? ''),
    actorName: String(data.actorName ?? 'Someone'),
    type: data.type as ActivityNotification['type'],
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    data: (data.data ?? { type: data.type }) as PushNotificationData,
    createdAt: String(data.createdAt ?? ''),
    readAt: typeof data.readAt === 'string' ? data.readAt : null,
  };
}

function monthlyNotificationsQuery(userId: string) {
  return query(
    notificationsCollection(userId),
    where('createdAt', '>=', getNotificationRetentionCutoffIso()),
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_SYNC_LIMIT)
  );
}

export async function createActivityNotificationsForRecipients(
  input: CreateActivityNotificationInput
): Promise<void> {
  if (input.recipientIds.length === 0) return;

  const createdAt = new Date().toISOString();
  let batch = writeBatch(db);
  let batchSize = 0;

  for (const recipientId of input.recipientIds) {
    const ref = doc(notificationsCollection(recipientId));
    batch.set(ref, {
      id: ref.id,
      userId: recipientId,
      actorId: input.actorId,
      actorName: input.actorName,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      createdAt,
      readAt: null,
    });
    batchSize += 1;

    if (batchSize >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }
}

export async function deleteExpiredActivityNotifications(userId: string): Promise<void> {
  const cutoff = getNotificationRetentionCutoffIso();

  while (true) {
    const snapshot = await getDocs(
      query(
        notificationsCollection(userId),
        where('createdAt', '<', cutoff),
        limit(FIRESTORE_BATCH_LIMIT)
      )
    );

    if (snapshot.empty) return;

    let batch = writeBatch(db);
    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();

    if (snapshot.size < FIRESTORE_BATCH_LIMIT) return;
  }
}

export function subscribeToActivityNotifications(
  userId: string,
  callback: (notifications: ActivityNotification[]) => void
): () => void {
  return onSnapshot(
    monthlyNotificationsQuery(userId),
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) =>
          mapNotification(docSnap.id, docSnap.data() as Record<string, unknown>)
        )
      );
    },
    (error) => {
      console.warn('[activityNotifications] subscribe:', error.code, error.message);
      callback([]);
    }
  );
}

function notificationMatchesPushData(
  notification: ActivityNotification,
  data: Partial<PushNotificationData>
): boolean {
  if (notification.readAt) return false;
  if (data.type && notification.type !== data.type) return false;
  if (data.groupId && notification.data.groupId !== data.groupId) return false;
  if (data.itemId && notification.data.itemId !== data.itemId) return false;
  if (data.commentId && notification.data.commentId !== data.commentId) return false;
  if (data.occurrence && notification.data.occurrence !== data.occurrence) return false;
  return true;
}

async function findUnreadNotificationFromPush(
  userId: string,
  data: Partial<PushNotificationData>
): Promise<QueryDocumentSnapshot | null> {
  if (data.type && data.itemId) {
    try {
      const constraints: QueryConstraint[] = [
        where('createdAt', '>=', getNotificationRetentionCutoffIso()),
        where('type', '==', data.type),
        where('data.itemId', '==', data.itemId),
      ];

      if (data.commentId) {
        constraints.push(where('data.commentId', '==', data.commentId));
      }

      const snapshot = await getDocs(
        query(notificationsCollection(userId), ...constraints, limit(5))
      );
      const match = snapshot.docs.find((docSnap) => !docSnap.data().readAt);
      if (match) return match;
    } catch (error) {
      console.warn('[activityNotifications] targeted push lookup:', error);
    }
  }

  const snapshot = await getDocs(
    query(monthlyNotificationsQuery(userId), limit(MARK_READ_SCAN_LIMIT))
  );

  return (
    snapshot.docs.find((docSnap) =>
      notificationMatchesPushData(
        mapNotification(docSnap.id, docSnap.data() as Record<string, unknown>),
        data
      )
    ) ?? null
  );
}

export async function markActivityNotificationReadFromPush(
  userId: string,
  data: Partial<PushNotificationData>
): Promise<void> {
  const match = await findUnreadNotificationFromPush(userId, data);
  if (!match) return;

  await updateDoc(match.ref, {
    readAt: new Date().toISOString(),
  });
}

export async function markActivityNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
    readAt: new Date().toISOString(),
  });
}

export async function markAllActivityNotificationsRead(userId: string): Promise<void> {
  const snapshot = await getDocs(query(monthlyNotificationsQuery(userId), limit(MARK_READ_SCAN_LIMIT)));
  const now = new Date().toISOString();
  let batch = writeBatch(db);
  let batchSize = 0;

  for (const docSnap of snapshot.docs) {
    if (docSnap.data().readAt) continue;
    batch.update(docSnap.ref, { readAt: now });
    batchSize += 1;

    if (batchSize >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }
}

export const notificationRetentionDays = NOTIFICATION_RETENTION_DAYS;
