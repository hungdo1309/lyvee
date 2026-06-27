import { Item, ItemInput } from '../types';
import { APP_NAME } from '../constants/app';
import { enqueuePushEvent } from './pushNotifications';
import {
  excludeActor,
  getItemAssigneesAndCreator,
  getTaskOverdueRecipients,
  itemHasMeaningfulChanges,
} from '../utils/pushRecipients';
import { getUserProfile } from './auth';

async function actorName(actorId: string): Promise<string> {
  const profile = await getUserProfile(actorId);
  return profile?.name ?? 'Someone';
}

export async function notifyItemCreated(item: Item, actorId: string): Promise<void> {
  const assignees = excludeActor(actorId, item.assignedTo);
  if (assignees.length === 0) return;

  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'item.created',
    actorId,
    actorName: name,
    recipientIds: assignees,
    title: 'New assignment',
    body: `${name} assigned you "${item.title}".`,
    data: { type: 'item.created', groupId: item.groupId, itemId: item.id },
  });
}

export async function notifyItemUpdated(
  before: Item,
  updates: Partial<ItemInput>,
  actorId: string
): Promise<void> {
  if (!itemHasMeaningfulChanges(before, updates)) return;

  const name = await actorName(actorId);
  const after: Item = {
    ...before,
    ...updates,
    title: updates.title?.trim() ?? before.title,
    assignedTo: updates.assignedTo ?? before.assignedTo,
    allowedMembers:
      updates.visibility === 'custom'
        ? (updates.allowedMembers ?? before.allowedMembers)
        : updates.visibility !== undefined
          ? []
          : before.allowedMembers,
  };

  const recipientIds = getItemAssigneesAndCreator(after, actorId);
  if (recipientIds.length === 0) return;

  await enqueuePushEvent({
    type: 'item.updated',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Item updated',
    body: `${name} updated "${after.title}".`,
    data: { type: 'item.updated', groupId: after.groupId, itemId: after.id },
  });
}

export async function notifyItemDeleted(item: Item, actorId: string): Promise<void> {
  const recipientIds = getItemAssigneesAndCreator(item, actorId);
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'item.deleted',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Item deleted',
    body: `${name} deleted "${item.title}".`,
    data: { type: 'item.deleted', groupId: item.groupId, itemId: item.id },
  });
}

export async function notifyItemCompleted(
  item: Item,
  actorId: string,
  occurrenceDate?: string
): Promise<void> {
  const recipientIds = getItemAssigneesAndCreator(item, actorId);
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'item.completed',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Task completed',
    body: `${name} completed "${item.title}".`,
    data: {
      type: 'item.completed',
      groupId: item.groupId,
      itemId: item.id,
      occurrence: occurrenceDate ?? '',
    },
  });
}

export async function notifyTaskOverdue(
  item: Item,
  occurrenceDate: string,
  actorId: string
): Promise<void> {
  const recipientIds = getTaskOverdueRecipients(item);
  if (recipientIds.length === 0) return;

  await enqueuePushEvent({
    type: 'item.overdue',
    actorId,
    actorName: APP_NAME,
    recipientIds,
    includeActor: true,
    title: 'Task overdue',
    body: `Task overdue: "${item.title}".`,
    data: {
      type: 'item.overdue',
      groupId: item.groupId,
      itemId: item.id,
      occurrence: occurrenceDate,
    },
  });
}
