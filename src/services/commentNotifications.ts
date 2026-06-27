import { Item } from '../types';
import { ItemComment } from '../types/comments';
import {
  chunkRecipientIds,
  getCommentNotificationRecipients,
  getNewMentionRecipients,
} from '../utils/commentMentions';
import { PushNotificationType } from '../types/pushNotifications';
import { uniqueIds } from '../utils/pushRecipients';
import { enqueuePushEvent } from './pushNotifications';

async function notifyRecipients(
  item: Item,
  actorId: string,
  actorName: string,
  recipientIds: string[],
  comment: ItemComment,
  body: string,
  type:
    | Extract<PushNotificationType, 'item.comment.mention' | 'item.comment.reply'>
    | 'item.comment.reaction',
  reaction?: string
): Promise<void> {
  if (recipientIds.length === 0) return;

  const chunks = chunkRecipientIds(recipientIds);
  for (const chunk of chunks) {
    await enqueuePushEvent({
      type,
      actorId,
      actorName,
      recipientIds: chunk,
      title: item.title,
      body,
      data: {
        type,
        groupId: item.groupId,
        itemId: item.id,
        commentId: comment.id,
        ...(reaction ? { reaction } : {}),
      },
    });
  }
}

export async function notifyCommentMentions(
  item: Item,
  comment: ItemComment,
  groupMemberIds: string[],
  actorId: string,
  actorName: string,
  excludeRecipientIds: string[] = []
): Promise<void> {
  const excluded = new Set(excludeRecipientIds);
  const recipientIds = getCommentNotificationRecipients(
    item,
    groupMemberIds,
    comment.mentionUserIds,
    comment.mentionEveryone,
    actorId
  ).filter((recipientId) => !excluded.has(recipientId));

  if (recipientIds.length === 0) return;

  const preview = comment.body.trim().slice(0, 80);
  const body = comment.mentionEveryone
    ? `${actorName} tagged everyone in a comment: ${preview}`
    : `${actorName} mentioned you in a comment: ${preview}`;

  await notifyRecipients(
    item,
    actorId,
    actorName,
    recipientIds,
    comment,
    body,
    'item.comment.mention'
  );
}

export async function notifyCommentReply(
  item: Item,
  comment: ItemComment,
  parentComment: ItemComment,
  rootAuthorId: string | null,
  actorId: string,
  actorName: string,
  realMentionRecipientIds: string[] = []
): Promise<void> {
  const preview = comment.body.trim().slice(0, 80);
  const body = `${actorName} replied to your comment: ${preview}`;

  const mentionRecipients = new Set(realMentionRecipientIds);
  const recipientIds = uniqueIds([
    ...(parentComment.authorId !== actorId ? [parentComment.authorId] : []),
    ...(rootAuthorId &&
    rootAuthorId !== actorId &&
    rootAuthorId !== parentComment.authorId &&
    !mentionRecipients.has(rootAuthorId)
      ? [rootAuthorId]
      : []),
  ]);

  if (recipientIds.length === 0) return;

  await notifyRecipients(
    item,
    actorId,
    actorName,
    recipientIds,
    comment,
    body,
    'item.comment.reply'
  );
}

export async function notifyCommentReaction(
  item: Item,
  comment: ItemComment,
  actorId: string,
  actorName: string,
  emoji: string
): Promise<void> {
  if (comment.authorId === actorId) return;

  const preview = comment.body.trim().slice(0, 80);
  const body = `${actorName} reacted ${emoji} to your comment: ${preview}`;

  await notifyRecipients(
    item,
    actorId,
    actorName,
    [comment.authorId],
    comment,
    body,
    'item.comment.reaction',
    emoji
  );
}

export async function notifyNewCommentMentions(
  item: Item,
  comment: ItemComment,
  groupMemberIds: string[],
  actorId: string,
  actorName: string,
  previous: Pick<ItemComment, 'mentionUserIds' | 'mentionEveryone'>,
  excludeRecipientIds: string[] = []
): Promise<void> {
  const excluded = new Set(excludeRecipientIds);
  const recipientIds = getNewMentionRecipients(
    previous,
    comment,
    item,
    groupMemberIds,
    actorId
  ).filter((recipientId) => !excluded.has(recipientId));

  if (recipientIds.length === 0) return;

  const preview = comment.body.trim().slice(0, 80);
  const body = `${actorName} mentioned you in a comment: ${preview}`;
  await notifyRecipients(
    item,
    actorId,
    actorName,
    recipientIds,
    comment,
    body,
    'item.comment.mention'
  );
}
