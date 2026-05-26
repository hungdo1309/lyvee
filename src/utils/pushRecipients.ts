import { Group, Item, ItemInput } from '../types';
import { getGroupAdminIds } from './groupRoles';

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function excludeActor(actorId: string, recipientIds: string[]): string[] {
  return uniqueIds(recipientIds.filter((id) => id !== actorId));
}

export function getGroupManagers(group: Group): string[] {
  return uniqueIds([group.ownerId, ...getGroupAdminIds(group)]);
}

export function getOtherGroupManagers(group: Group, actorId: string): string[] {
  return excludeActor(actorId, getGroupManagers(group));
}

export function getOtherGroupMembers(
  group: Group,
  actorId: string,
  alsoExclude: string[] = []
): string[] {
  const excluded = new Set([actorId, ...alsoExclude]);
  return group.members.filter((memberId) => !excluded.has(memberId));
}

export function getItemAssigneesAndCreator(item: Item, actorId: string): string[] {
  return excludeActor(actorId, uniqueIds([item.createdBy, ...item.assignedTo]));
}

export function itemHasMeaningfulChanges(
  before: Item,
  updates: Partial<ItemInput>
): boolean {
  if (updates.title !== undefined && updates.title.trim() !== before.title) return true;
  if (updates.notes !== undefined && updates.notes.trim() !== before.notes) return true;
  if (updates.type !== undefined && updates.type !== before.type) return true;
  if (updates.dateTime !== undefined && updates.dateTime !== before.dateTime) return true;
  if (updates.visibility !== undefined && updates.visibility !== before.visibility) return true;
  if (updates.reminderOffset !== undefined && updates.reminderOffset !== before.reminderOffset)
    return true;
  if (updates.completed !== undefined && updates.completed !== before.completed) return true;
  if (
    updates.assignedTo !== undefined &&
    JSON.stringify(updates.assignedTo) !== JSON.stringify(before.assignedTo)
  ) {
    return true;
  }
  if (
    updates.allowedMembers !== undefined &&
    JSON.stringify(updates.allowedMembers) !== JSON.stringify(before.allowedMembers)
  ) {
    return true;
  }
  if (
    updates.completedOccurrences !== undefined &&
    JSON.stringify(updates.completedOccurrences) !==
      JSON.stringify(before.completedOccurrences ?? [])
  ) {
    return true;
  }
  if (
    updates.recurringRule !== undefined &&
    JSON.stringify(updates.recurringRule) !== JSON.stringify(before.recurringRule)
  ) {
    return true;
  }
  return false;
}
