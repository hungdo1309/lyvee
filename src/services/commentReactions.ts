import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CommentReactionEmoji,
  isValidReactionEmoji,
} from '../constants/commentReactions';
import { Item } from '../types';
import { CommentReaction, CommentReactionCounts, ItemComment } from '../types/comments';
import { notifyCommentReaction } from './commentNotifications';

const FIRESTORE_GET_ALL_LIMIT = 10;
const FIRESTORE_BATCH_LIMIT = 500;

function commentRef(itemId: string, commentId: string) {
  return doc(db, 'items', itemId, 'comments', commentId);
}

function reactionRef(itemId: string, commentId: string, userId: string) {
  return doc(db, 'items', itemId, 'comments', commentId, 'reactions', userId);
}

function reactionsCollection(itemId: string, commentId: string) {
  return collection(db, 'items', itemId, 'comments', commentId, 'reactions');
}

function normalizeReactionCounts(value: unknown): CommentReactionCounts {
  if (!value || typeof value !== 'object') return {};

  const counts: CommentReactionCounts = {};
  for (const [emoji, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && raw > 0 && isValidReactionEmoji(emoji)) {
      counts[emoji] = raw;
    }
  }
  return counts;
}

function cloneCounts(counts: CommentReactionCounts): CommentReactionCounts {
  return { ...counts };
}

function incrementCount(
  counts: CommentReactionCounts,
  emoji: CommentReactionEmoji,
  delta: number
): CommentReactionCounts {
  const next = cloneCounts(counts);
  const current = next[emoji] ?? 0;
  const updated = current + delta;

  if (updated <= 0) {
    delete next[emoji];
  } else {
    next[emoji] = updated;
  }

  return next;
}

async function getAllInChunks<T>(
  refs: ReturnType<typeof doc>[]
): Promise<Array<{ id: string; data: () => Record<string, unknown> | undefined; exists: () => boolean }>> {
  const snapshots: Array<{
    id: string;
    data: () => Record<string, unknown> | undefined;
    exists: () => boolean;
  }> = [];

  for (let index = 0; index < refs.length; index += FIRESTORE_GET_ALL_LIMIT) {
    const chunk = refs.slice(index, index + FIRESTORE_GET_ALL_LIMIT);
    const chunkSnapshots = await Promise.all(chunk.map((ref) => getDoc(ref)));
    snapshots.push(...chunkSnapshots);
  }

  return snapshots;
}

export async function fetchUserReactionsForComments(
  itemId: string,
  commentIds: string[],
  userId: string
): Promise<Partial<Record<string, CommentReactionEmoji>>> {
  if (commentIds.length === 0) return {};

  const refs = commentIds.map((commentId) => reactionRef(itemId, commentId, userId));
  const snapshots = await getAllInChunks(refs);

  const entries: Array<[string, CommentReactionEmoji]> = [];
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) return;
    const emoji = snapshot.data()?.emoji;
    if (typeof emoji !== 'string' || !isValidReactionEmoji(emoji)) return;
    entries.push([commentIds[index], emoji]);
  });

  return Object.fromEntries(entries);
}

export async function fetchCommentReactions(
  itemId: string,
  commentId: string
): Promise<CommentReaction[]> {
  const snapshot = await getDocs(reactionsCollection(itemId, commentId));

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const emoji = data.emoji;
      if (typeof emoji !== 'string' || !isValidReactionEmoji(emoji)) return null;

      return {
        userId: docSnap.id,
        emoji,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
      } satisfies CommentReaction;
    })
    .filter((reaction): reaction is CommentReaction => reaction !== null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export interface ToggleCommentReactionResult {
  reactionCounts: CommentReactionCounts;
  userReaction: CommentReactionEmoji | null;
  notified: boolean;
}

export async function toggleCommentReaction(
  item: Item,
  comment: ItemComment,
  actorId: string,
  emoji: CommentReactionEmoji,
  actorName?: string
): Promise<ToggleCommentReactionResult> {
  if (!isValidReactionEmoji(emoji)) {
    throw new Error('Invalid reaction');
  }

  const commentDocument = commentRef(item.id, comment.id);
  const userReactionDocument = reactionRef(item.id, comment.id, actorId);
  const now = new Date().toISOString();

  const result = await runTransaction(db, async (transaction) => {
    const [commentSnap, reactionSnap] = await Promise.all([
      transaction.get(commentDocument),
      transaction.get(userReactionDocument),
    ]);

    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const currentCounts = normalizeReactionCounts(commentSnap.data()?.reactionCounts);
    const previousEmoji =
      reactionSnap.exists() && isValidReactionEmoji(String(reactionSnap.data()?.emoji))
        ? String(reactionSnap.data()?.emoji)
        : null;

    let nextCounts = currentCounts;
    let nextUserReaction: CommentReactionEmoji | null = emoji;
    let removed = false;

    if (previousEmoji === emoji) {
      transaction.delete(userReactionDocument);
      nextCounts = incrementCount(currentCounts, emoji, -1);
      nextUserReaction = null;
      removed = true;
    } else {
      transaction.set(userReactionDocument, {
        emoji,
        userId: actorId,
        createdAt: now,
      });

      if (previousEmoji) {
        nextCounts = incrementCount(currentCounts, previousEmoji, -1);
      }
      nextCounts = incrementCount(nextCounts, emoji, 1);
    }

    transaction.update(commentDocument, {
      reactionCounts: nextCounts,
      updatedAt: now,
    });

    return {
      reactionCounts: nextCounts,
      userReaction: nextUserReaction,
      removed,
    };
  });

  let notified = false;
  if (!result.removed && comment.authorId !== actorId) {
    await notifyCommentReaction(
      item,
      comment,
      actorId,
      actorName ?? 'Someone',
      emoji
    );
    notified = true;
  }

  return {
    reactionCounts: result.reactionCounts,
    userReaction: result.userReaction,
    notified,
  };
}

export async function deleteReactionsForComment(
  itemId: string,
  commentId: string
): Promise<void> {
  const snapshot = await getDocs(reactionsCollection(itemId, commentId));
  if (snapshot.empty) return;

  for (let index = 0; index < snapshot.docs.length; index += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + FIRESTORE_BATCH_LIMIT).forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
}

export { normalizeReactionCounts };
