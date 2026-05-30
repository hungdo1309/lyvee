import { Item } from '../types';
import { ItemComment } from '../types/comments';
import { chunkRecipientIds, getCommentNotificationRecipients, getNewMentionRecipients } from '../utils/commentMentions';
import { enqueuePushEvent } from './pushNotifications';

async function notifyRecipients(
  item: Item,
  actorId: string,
  recipientIds: string[],
  comment: ItemComment,
  body: string
): Promise<void> {
  if (recipientIds.length === 0) return;

  const chunks = chunkRecipientIds(recipientIds);
  for (const chunk of chunks) {
    await enqueuePushEvent({
      type: 'item.comment.mention',
      actorId,
      recipientIds: chunk,
      title: item.title,
      body,
      data: {
        type: 'item.comment.mention',
        groupId: item.groupId,
        itemId: item.id,
        commentId: comment.id,
      },
    });
  }
}

export async function notifyCommentMentions(
  item: Item,
  comment: ItemComment,
  groupMemberIds: string[],
  actorId: string,
  actorName: string
): Promise<void> {
  const recipientIds = getCommentNotificationRecipients(
    item,
    groupMemberIds,
    comment.mentionUserIds,
    comment.mentionEveryone,
    actorId
  );

  if (recipientIds.length === 0) return;

  const preview = comment.body.trim().slice(0, 80);
  const body = comment.mentionEveryone
    ? `${actorName} tagged everyone in a comment: ${preview}`
    : `${actorName} mentioned you in a comment: ${preview}`;

  await notifyRecipients(item, actorId, recipientIds, comment, body);
}

export async function notifyNewCommentMentions(
  item: Item,
  comment: ItemComment,
  groupMemberIds: string[],
  actorId: string,
  actorName: string,
  previous: Pick<ItemComment, 'mentionUserIds' | 'mentionEveryone'>
): Promise<void> {
  const recipientIds = getNewMentionRecipients(
    previous,
    comment,
    item,
    groupMemberIds,
    actorId
  );

  if (recipientIds.length === 0) return;

  const preview = comment.body.trim().slice(0, 80);
  const body = `${actorName} mentioned you in a comment: ${preview}`;
  await notifyRecipients(item, actorId, recipientIds, comment, body);
}
