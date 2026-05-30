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
  startAfter,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  getNotificationRetentionCutoffIso,
  NOTIFICATION_RETENTION_DAYS,
  NOTIFICATION_HISTORY_SCAN_LIMIT,
  NOTIFICATION_LIVE_SYNC_LIMIT,
  NOTIFICATION_PAGE_SIZE,
} from '../constants/notifications';
import {
  ActivityNotification,
  CreateActivityNotificationInput,
} from '../types/activityNotifications';
import { PushNotificationData } from '../types/pushNotifications';

export { POPOVER_NOTIFICATION_LIMIT } from '../constants/notifications';

const MARK_READ_SCAN_LIMIT = NOTIFICATION_HISTORY_SCAN_LIMIT;
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

function monthlyNotificationsQuery(userId: string, maxResults = NOTIFICATION_LIVE_SYNC_LIMIT) {
  return query(
    notificationsCollection(userId),
    where('createdAt', '>=', getNotificationRetentionCutoffIso()),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
}

export async function createActivityNotificationsForRecipients(
  input: CreateActivityNotificationInput
): Promise<Record<string, string>> {
  if (input.recipientIds.length === 0) return {};

  const createdAt = new Date().toISOString();
  const notificationIds: Record<string, string> = {};
  let batch = writeBatch(db);
  let batchSize = 0;

  for (const recipientId of input.recipientIds) {
    const ref = doc(notificationsCollection(recipientId));
    notificationIds[recipientId] = ref.id;
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

  return notificationIds;
}

export interface ActivityNotificationsPage {
  notifications: ActivityNotification[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}

export async function fetchActivityNotificationsPage(
  userId: string,
  pageSize = NOTIFICATION_PAGE_SIZE,
  cursor?: QueryDocumentSnapshot | null
): Promise<ActivityNotificationsPage> {
  const q = cursor
    ? query(
        notificationsCollection(userId),
        where('createdAt', '>=', getNotificationRetentionCutoffIso()),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageSize + 1)
      )
    : query(
        notificationsCollection(userId),
        where('createdAt', '>=', getNotificationRetentionCutoffIso()),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );

  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    notifications: docs.map((docSnap) =>
      mapNotification(docSnap.id, docSnap.data() as Record<string, unknown>)
    ),
    hasMore,
    lastDoc: docs[docs.length - 1] ?? null,
  };
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

export interface ActivityNotificationsLiveSnapshot {
  notifications: ActivityNotification[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export function subscribeToActivityNotifications(
  userId: string,
  callback: (snapshot: ActivityNotificationsLiveSnapshot) => void
): () => void {
  return onSnapshot(
    monthlyNotificationsQuery(userId),
    (snapshot) => {
      const docs = snapshot.docs;
      callback({
        notifications: docs.map((docSnap) =>
          mapNotification(docSnap.id, docSnap.data() as Record<string, unknown>)
        ),
        lastDoc: docs[docs.length - 1] ?? null,
        hasMore: docs.length >= NOTIFICATION_LIVE_SYNC_LIMIT,
      });
    },
    (error) => {
      console.warn('[activityNotifications] subscribe:', error.code, error.message);
      callback({ notifications: [], lastDoc: null, hasMore: false });
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
  if (data.reaction && notification.data.reaction !== data.reaction) return false;
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
  if (data.notificationId) {
    await markActivityNotificationRead(userId, data.notificationId);
    return;
  }

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

export async function markActivityNotificationsRead(
  userId: string,
  notificationIds: string[]
): Promise<void> {
  if (notificationIds.length === 0) return;

  const now = new Date().toISOString();
  let batch = writeBatch(db);
  let batchSize = 0;

  for (const notificationId of notificationIds) {
    batch.update(doc(db, 'users', userId, 'notifications', notificationId), {
      readAt: now,
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

export async function markAllActivityNotificationsRead(userId: string): Promise<void> {
  const unreadIds: string[] = [];
  let cursor: QueryDocumentSnapshot | null = null;

  while (true) {
    const page = await fetchActivityNotificationsPage(
      userId,
      NOTIFICATION_PAGE_SIZE,
      cursor
    );

    unreadIds.push(
      ...page.notifications
        .filter((notification) => !notification.readAt)
        .map((notification) => notification.id)
    );

    if (!page.hasMore || !page.lastDoc) break;
    cursor = page.lastDoc;
  }

  await markActivityNotificationsRead(userId, unreadIds);
}

export const notificationRetentionDays = NOTIFICATION_RETENTION_DAYS;
