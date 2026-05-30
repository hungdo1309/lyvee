import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  getDocs,
  writeBatch,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Item } from '../types';
import { ItemComment, ItemCommentInput } from '../types/comments';
import { sanitizeMentionUserIds } from '../utils/commentMentions';
import { getUserProfile } from './auth';
import {
  notifyCommentMentions,
  notifyNewCommentMentions,
} from './commentNotifications';

function commentsCollection(itemId: string) {
  return collection(db, 'items', itemId, 'comments');
}

function normalizeCommentTimestamp(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeCommentIso(value: unknown): string {
  const timestamp = normalizeCommentTimestamp(value);
  return timestamp > 0 ? new Date(timestamp).toISOString() : '';
}

export function compareCommentsByCreatedAt(
  left: ItemComment,
  right: ItemComment,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const delta =
    normalizeCommentTimestamp(left.createdAt) -
    normalizeCommentTimestamp(right.createdAt);

  if (delta !== 0) {
    return direction === 'asc' ? delta : -delta;
  }

  return left.id.localeCompare(right.id);
}

function mapComment(id: string, data: Record<string, unknown>): ItemComment {
  return {
    id,
    itemId: String(data.itemId ?? ''),
    groupId: String(data.groupId ?? ''),
    parentCommentId: (data.parentCommentId as string | null) ?? null,
    threadRootId: (data.threadRootId as string | null) ?? null,
    authorId: String(data.authorId ?? ''),
    body: String(data.body ?? ''),
    mentionUserIds: Array.isArray(data.mentionUserIds)
      ? (data.mentionUserIds as string[])
      : [],
    mentionEveryone: Boolean(data.mentionEveryone),
    createdAt: normalizeCommentIso(data.createdAt),
    updatedAt: normalizeCommentIso(data.updatedAt),
    editedAt: data.editedAt ? normalizeCommentIso(data.editedAt) : undefined,
  };
}

export const COMMENTS_FETCH_PAGE_SIZE = 50;

export interface ItemCommentsPage {
  comments: ItemComment[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}

export function mergeItemComments(
  existing: ItemComment[],
  incoming: ItemComment[]
): ItemComment[] {
  const byId = new Map(existing.map((comment) => [comment.id, comment]));
  for (const comment of incoming) {
    byId.set(comment.id, comment);
  }
  return Array.from(byId.values());
}

export function mergeItemCommentsIfChanged(
  existing: ItemComment[],
  incoming: ItemComment[]
): ItemComment[] {
  const merged = mergeItemComments(existing, incoming);
  if (merged.length !== existing.length) return merged;

  for (let i = 0; i < merged.length; i++) {
    if (
      merged[i].id !== existing[i].id ||
      merged[i].updatedAt !== existing[i].updatedAt
    ) {
      return merged;
    }
  }

  return existing;
}

export async function fetchItemCommentsPage(
  itemId: string,
  pageSize = COMMENTS_FETCH_PAGE_SIZE,
  cursor?: QueryDocumentSnapshot | null
): Promise<ItemCommentsPage> {
  const q = cursor
    ? query(
        commentsCollection(itemId),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageSize + 1)
      )
    : query(
        commentsCollection(itemId),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );

  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    comments: docs.map((docSnap) =>
      mapComment(docSnap.id, docSnap.data() as Record<string, unknown>)
    ),
    hasMore,
    lastDoc: docs[docs.length - 1] ?? null,
  };
}

export interface RecentItemCommentsSnapshot {
  comments: ItemComment[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}

/** Live updates for the most recent comment page only (keeps listener reads bounded). */
export function subscribeToRecentItemComments(
  itemId: string,
  callback: (snapshot: RecentItemCommentsSnapshot) => void,
  pageSize = COMMENTS_FETCH_PAGE_SIZE
): () => void {
  const q = query(
    commentsCollection(itemId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback({
        comments: snapshot.docs.map((docSnap) =>
          mapComment(docSnap.id, docSnap.data() as Record<string, unknown>)
        ),
        hasMore: snapshot.docs.length >= pageSize,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] ?? null,
      });
    },
    (error) => {
      console.warn('[comments] subscribeToRecentItemComments:', error.code, error.message);
      callback({ comments: [], hasMore: false, lastDoc: null });
    }
  );
}

export async function createItemComment(
  item: Item,
  input: ItemCommentInput,
  authorId: string,
  groupMemberIds: string[],
  parentComment?: ItemComment | null
): Promise<ItemComment> {
  const body = input.body.trim();
  if (!body) throw new Error('Comment cannot be empty');

  const mentionUserIds = sanitizeMentionUserIds(input.mentionUserIds, authorId);
  const mentionEveryone = input.mentionEveryone === true;
  const id = doc(commentsCollection(item.id)).id;
  const now = new Date().toISOString();
  const parentCommentId = input.parentCommentId ?? null;
  const threadRootId = parentComment
    ? parentComment.threadRootId ?? parentComment.id
    : id;

  const comment: ItemComment = {
    id,
    itemId: item.id,
    groupId: item.groupId,
    parentCommentId,
    threadRootId,
    authorId,
    body,
    mentionUserIds,
    mentionEveryone,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'items', item.id, 'comments', id), comment);

  const actor = await getUserProfile(authorId);
  await notifyCommentMentions(
    item,
    comment,
    groupMemberIds,
    authorId,
    actor?.name ?? 'Someone'
  );

  return comment;
}

export async function updateItemComment(
  item: Item,
  comment: ItemComment,
  updates: Pick<ItemCommentInput, 'body' | 'mentionUserIds' | 'mentionEveryone'>,
  authorId: string,
  groupMemberIds: string[]
): Promise<void> {
  if (comment.authorId !== authorId) {
    throw new Error('You can only edit your own comments');
  }

  const body = updates.body.trim();
  if (!body) throw new Error('Comment cannot be empty');

  const mentionUserIds = sanitizeMentionUserIds(updates.mentionUserIds, authorId);
  const mentionEveryone = updates.mentionEveryone === true;
  const now = new Date().toISOString();
  const previous = {
    mentionUserIds: comment.mentionUserIds,
    mentionEveryone: comment.mentionEveryone,
  };

  const nextComment: ItemComment = {
    ...comment,
    body,
    mentionUserIds,
    mentionEveryone,
    updatedAt: now,
    editedAt: now,
  };

  await setDoc(
    doc(db, 'items', item.id, 'comments', comment.id),
    {
      body,
      mentionUserIds,
      mentionEveryone,
      updatedAt: now,
      editedAt: now,
    },
    { merge: true }
  );

  const actor = await getUserProfile(authorId);
  await notifyNewCommentMentions(
    item,
    nextComment,
    groupMemberIds,
    authorId,
    actor?.name ?? 'Someone',
    previous
  );
}

const FIRESTORE_BATCH_LIMIT = 500;

export async function deleteItemComment(
  itemId: string,
  comment: ItemComment,
  allComments: ItemComment[],
  authorId: string
): Promise<void> {
  if (comment.authorId !== authorId) {
    throw new Error('You can only delete your own comments');
  }

  const isRoot = !comment.parentCommentId;
  const commentsToDelete = isRoot
    ? [comment, ...getCommentReplies(allComments, comment.id)]
    : [comment];

  for (let i = 0; i < commentsToDelete.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    commentsToDelete.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((entry) => {
      batch.delete(doc(db, 'items', itemId, 'comments', entry.id));
    });
    await batch.commit();
  }
}

export async function deleteCommentsForItem(itemId: string): Promise<void> {
  const snapshot = await getDocs(commentsCollection(itemId));
  if (snapshot.empty) return;

  for (let i = 0; i < snapshot.docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + FIRESTORE_BATCH_LIMIT).forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
}

function resolveThreadRootId(
  comment: ItemComment,
  byId: Map<string, ItemComment>
): string | null {
  if (comment.threadRootId) return comment.threadRootId;

  let parentId = comment.parentCommentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) return null;
    if (!parent.parentCommentId) return parent.id;
    parentId = parent.parentCommentId;
  }

  return null;
}

interface CommentIndex {
  roots: ItemComment[];
  repliesByRoot: Map<string, ItemComment[]>;
  activityByRoot: Map<string, number>;
}

function buildCommentIndex(comments: ItemComment[]): CommentIndex {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const repliesByRoot = new Map<string, ItemComment[]>();
  const roots: ItemComment[] = [];

  for (const comment of comments) {
    if (isRootComment(comment)) {
      roots.push(comment);
      continue;
    }

    const rootId = resolveThreadRootId(comment, byId);
    if (!rootId) continue;

    const replies = repliesByRoot.get(rootId) ?? [];
    replies.push(comment);
    repliesByRoot.set(rootId, replies);
  }

  const uniqueRoots = Array.from(new Map(roots.map((root) => [root.id, root])).values());
  const activityByRoot = new Map<string, number>();

  for (const root of uniqueRoots) {
    const replies = repliesByRoot.get(root.id) ?? [];
    activityByRoot.set(
      root.id,
      Math.max(
        normalizeCommentTimestamp(root.createdAt),
        ...replies.map((reply) => normalizeCommentTimestamp(reply.createdAt)),
        0
      )
    );
  }

  return { roots: uniqueRoots, repliesByRoot, activityByRoot };
}

export interface CommentThreadView {
  root: ItemComment;
  replies: ItemComment[];
}

export function buildCommentThreadViews(comments: ItemComment[]): CommentThreadView[] {
  if (comments.length === 0) return [];

  const index = buildCommentIndex(comments);
  const sortedRoots = [...index.roots].sort((left, right) => {
    const activityDelta =
      (index.activityByRoot.get(right.id) ?? 0) - (index.activityByRoot.get(left.id) ?? 0);

    if (activityDelta !== 0) {
      return activityDelta;
    }

    return compareCommentsByCreatedAt(left, right, 'desc');
  });

  return sortedRoots.map((root) => ({
    root,
    replies: [...(index.repliesByRoot.get(root.id) ?? [])].sort((left, right) =>
      compareCommentsByCreatedAt(left, right, 'asc')
    ),
  }));
}

function isRootComment(comment: ItemComment): boolean {
  return !comment.parentCommentId;
}

export function buildCommentThreads(comments: ItemComment[]): ItemComment[] {
  return buildCommentThreadViews(comments).map((thread) => thread.root);
}

export function getCommentReplies(
  comments: ItemComment[],
  rootCommentId: string
): ItemComment[] {
  const index = buildCommentIndex(comments);
  return [...(index.repliesByRoot.get(rootCommentId) ?? [])].sort((left, right) =>
    compareCommentsByCreatedAt(left, right, 'asc')
  );
}
