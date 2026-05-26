import { Item, ItemInput } from '../types';
import { enqueuePushEvent } from './pushNotifications';
import {
  excludeActor,
  getItemAssigneesAndCreator,
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
    notes: updates.notes?.trim() ?? before.notes,
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
    recipientIds,
    title: 'Item completed',
    body: `${name} completed "${item.title}".`,
    data: {
      type: 'item.completed',
      groupId: item.groupId,
      itemId: item.id,
      occurrence: occurrenceDate ?? '',
    },
  });
}
