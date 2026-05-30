import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  or,
  and,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Group, Item, ItemInput, ItemType, ItemVisibility, RecurringRule, DEFAULT_RECURRING_RULE } from '../types';
import { itemTypeSupportsRecurring } from '../constants/theme';
import { toOccurrenceKey } from '../utils/recurrence';
import { normalizeTags } from '../utils/tags';
import {
  computeVisibleTo,
  filterVisibleItems,
  isItemVisibleToMember,
} from '../utils/itemVisibility';
import { canUserCompleteTask } from '../utils/assignees';
import { normalizeReminderOffset } from '../utils/reminders';
import {
  notifyItemCompleted,
  notifyItemCreated,
  notifyItemDeleted,
  notifyItemUpdated,
} from './itemNotifications';
import { deleteCommentsForItem } from './comments';
import { fetchGroupMemberIds } from './groupMemberIds';

export { filterVisibleItems, isItemVisibleToMember };

async function getGroupMemberIds(groupId: string): Promise<string[]> {
  return fetchGroupMemberIds(groupId);
}

function shouldRefreshVisibleTo(
  updates: Partial<ItemInput>,
  item: Item | null | undefined
): boolean {
  if (!item) return true;
  return (
    updates.visibility !== undefined ||
    updates.allowedMembers !== undefined ||
    updates.assignedTo !== undefined
  );
}

function mergeItemState(
  itemId: string,
  base: Item,
  updates: Partial<ItemInput>,
  payload: Record<string, unknown>
): Item {
  return {
    ...base,
    ...updates,
    id: itemId,
    title:
      updates.title !== undefined
        ? String(payload.title)
        : base.title,
    tags:
      updates.tags !== undefined
        ? (payload.tags as string[])
        : base.tags,
    allowedMembers:
      updates.visibility !== undefined && updates.visibility !== 'custom'
        ? []
        : updates.allowedMembers ?? base.allowedMembers,
    visibility: updates.visibility ?? base.visibility,
    assignedTo: updates.assignedTo ?? base.assignedTo,
  };
}

async function applyVisibleTo(
  itemId: string,
  base: Item,
  updates: Partial<ItemInput>,
  payload: Record<string, unknown>,
  groupMembers?: string[]
): Promise<void> {
  const members = groupMembers ?? (await getGroupMemberIds(base.groupId));
  const merged = mergeItemState(itemId, base, updates, payload);
  payload.visibleTo = computeVisibleTo(merged, members);
}

function dedupeItemsById(items: Item[]): Item[] {
  const byId = new Map<string, Item>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

function normalizeItemInput(input: ItemInput): ItemInput {
  const recurringRule = itemTypeSupportsRecurring(input.type)
    ? input.recurringRule
    : DEFAULT_RECURRING_RULE;

  return {
    ...input,
    title: input.title.trim(),
    tags: normalizeTags(input.tags ?? []),
    allowedMembers: input.visibility === 'custom' ? input.allowedMembers : [],
    completedOccurrences: input.completedOccurrences ?? [],
    recurringRule,
    reminderOffset: normalizeReminderOffset(
      Boolean(input.dateTime),
      input.type,
      input.reminderOffset
    ),
  };
}

export function validateItemInput(input: ItemInput): string | null {
  if (!input.title.trim()) return 'Title is required';
  if (!input.groupId) return 'Group is required';
  if (input.visibility === 'custom' && input.allowedMembers.length === 0) {
    return 'Select at least one member for custom visibility';
  }
  if (
    itemTypeSupportsRecurring(input.type) &&
    input.recurringRule.frequency === 'custom' &&
    (!input.recurringRule.interval || input.recurringRule.interval < 1)
  ) {
    return 'Custom repeat interval must be at least 1';
  }
  return null;
}

export async function createItem(
  input: ItemInput,
  userId: string,
  groupMembers?: string[]
): Promise<Item> {
  const normalized = normalizeItemInput(input);
  const error = validateItemInput(normalized);
  if (error) throw new Error(error);

  const id = normalized.id ?? doc(collection(db, 'items')).id;
  const now = new Date().toISOString();
  const members = groupMembers ?? (await getGroupMemberIds(normalized.groupId));
  const item: Item = {
    ...normalized,
    id,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    visibleTo: computeVisibleTo(
      {
        visibility: normalized.visibility,
        allowedMembers: normalized.allowedMembers,
        assignedTo: normalized.assignedTo,
        createdBy: userId,
      },
      members
    ),
  };
  await setDoc(doc(db, 'items', id), item);
  await notifyItemCreated(item, userId);
  return item;
}

export async function updateItem(
  itemId: string,
  updates: Partial<ItemInput>,
  actorId?: string,
  sendPush = true,
  existingItem?: Item | null,
  groupMembers?: string[]
): Promise<void> {
  const existing =
    existingItem ?? (actorId && sendPush ? await getItem(itemId) : null);
  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.tags !== undefined) payload.tags = normalizeTags(updates.tags);
  if (updates.visibility !== undefined && updates.visibility !== 'custom') {
    payload.allowedMembers = [];
  }
  if (updates.type === 'document') {
    payload.recurringRule = DEFAULT_RECURRING_RULE;
  }
  if (updates.dateTime === null) {
    payload.reminderOffset = 'none';
  }

  const baseItem = existingItem ?? existing;
  if (shouldRefreshVisibleTo(updates, baseItem)) {
    const resolvedBase = baseItem ?? (await getItem(itemId));
    if (!resolvedBase) {
      throw new Error('Item not found');
    }
    await applyVisibleTo(itemId, resolvedBase, updates, payload, groupMembers);
  }

  await setDoc(doc(db, 'items', itemId), payload, { merge: true });

  if (actorId && baseItem && sendPush) {
    await notifyItemUpdated(baseItem, updates, actorId);
  }
}

export async function deleteItem(
  itemId: string,
  actorId?: string,
  existingItem?: Item | null
): Promise<void> {
  const existing = existingItem ?? (actorId ? await getItem(itemId) : null);
  await deleteCommentsForItem(itemId);
  await deleteDoc(doc(db, 'items', itemId));
  if (actorId && existing) {
    await notifyItemDeleted(existing, actorId);
  }
}

const FIRESTORE_BATCH_LIMIT = 500;

export async function deleteItemsForGroup(groupId: string): Promise<void> {
  const q = query(collection(db, 'items'), where('groupId', '==', groupId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const itemIds = snapshot.docs.map((docSnap) => docSnap.id);
  await Promise.all(itemIds.map((itemId) => deleteCommentsForItem(itemId)));

  for (let i = 0; i < snapshot.docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const slice = snapshot.docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    for (const docSnap of slice) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
}

function parseItem(docId: string, data: Record<string, unknown>): Item {
  return { id: docId, ...data } as Item;
}

export async function getItem(itemId: string): Promise<Item | null> {
  const snap = await getDoc(doc(db, 'items', itemId));
  if (!snap.exists()) return null;
  return parseItem(snap.id, snap.data() as Record<string, unknown>);
}

export function subscribeToItem(
  itemId: string,
  callback: (item: Item | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'items', itemId),
    (snap) => {
      callback(snap.exists() ? parseItem(snap.id, snap.data() as Record<string, unknown>) : null);
    },
    (error) => {
      console.warn('[items] subscribeToItem:', error.code, error.message);
      callback(null);
    }
  );
}

/** Toggle completion for a single or recurring task occurrence. */
export async function toggleItemComplete(
  item: Item,
  occurrenceDate?: string,
  actorId?: string,
  groupMemberIds?: string[]
): Promise<void> {
  if (item.type !== 'task') return;
  if (!canUserCompleteTask(item, actorId)) {
    throw new Error('Only assigned members can complete this task');
  }

  if (item.recurringRule.frequency === 'none' || !occurrenceDate) {
    const completed = !item.completed;
    await updateItem(item.id, { completed }, actorId, false, item);
    if (actorId && completed) {
      await notifyItemCompleted(item, actorId, undefined, groupMemberIds);
    }
    return;
  }

  const key = toOccurrenceKey(occurrenceDate);
  const current = item.completedOccurrences ?? [];
  const isCompleting = !current.includes(key);
  const completedOccurrences = isCompleting
    ? [...current, key]
    : current.filter((k) => k !== key);

  await updateItem(item.id, { completedOccurrences }, actorId, false, item);
  if (actorId && isCompleting) {
    await notifyItemCompleted(item, actorId, occurrenceDate, groupMemberIds);
  }
}

function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (!a.dateTime && !b.dateTime) return 0;
    if (!a.dateTime) return 1;
    if (!b.dateTime) return -1;
    return a.dateTime.localeCompare(b.dateTime);
  });
}

function subscribeToGroupItemQuery(
  groupId: string,
  userId: string,
  onItems: (items: Item[]) => void
): () => void {
  const q = query(
    collection(db, 'items'),
    or(
      and(where('groupId', '==', groupId), where('visibility', '==', 'everyone')),
      and(
        where('groupId', '==', groupId),
        where('visibleTo', 'array-contains', userId)
      )
    )
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = dedupeItemsById(
        snapshot.docs.map((d) => parseItem(d.id, d.data() as Record<string, unknown>))
      ).filter((item) => isItemVisibleToMember(item, userId));
      onItems(items);
    },
    (error) => {
      console.warn(
        `[items] subscribeToAllUserItems (${groupId}):`,
        error.code,
        error.message
      );
      onItems([]);
    }
  );
}

export interface AllUserItemsSubscription {
  setGroupIds: (groupIds: string[]) => void;
  destroy: () => void;
}

/** Manages per-group listeners incrementally to avoid full resync on group metadata changes. */
export function createAllUserItemsSubscription(
  userId: string,
  callback: (items: Item[]) => void
): AllUserItemsSubscription {
  const itemsByGroup = new Map<string, Item[]>();
  const listeners = new Map<string, () => void>();

  const emit = () => {
    callback(sortItems(Array.from(itemsByGroup.values()).flat()));
  };

  const removeGroupListener = (groupId: string) => {
    listeners.get(groupId)?.();
    listeners.delete(groupId);
    itemsByGroup.delete(groupId);
  };

  const addGroupListener = (groupId: string) => {
    if (listeners.has(groupId)) return;
    const unsub = subscribeToGroupItemQuery(groupId, userId, (items) => {
      itemsByGroup.set(groupId, items);
      emit();
    });
    listeners.set(groupId, unsub);
  };

  return {
    setGroupIds(groupIds: string[]) {
      const nextIds = new Set(groupIds);
      for (const groupId of listeners.keys()) {
        if (!nextIds.has(groupId)) {
          removeGroupListener(groupId);
        }
      }
      for (const groupId of groupIds) {
        addGroupListener(groupId);
      }
      if (groupIds.length === 0) {
        callback([]);
      }
    },
    destroy() {
      for (const unsub of listeners.values()) {
        unsub();
      }
      listeners.clear();
      itemsByGroup.clear();
    },
  };
}

export function subscribeToAllUserItems(
  groupIds: string[],
  userId: string,
  callback: (items: Item[]) => void
): () => void {
  const subscription = createAllUserItemsSubscription(userId, callback);
  subscription.setGroupIds(groupIds);
  return () => subscription.destroy();
}

export const ITEM_TYPES: ItemType[] = ['task', 'activity', 'document'];
export const VISIBILITY_OPTIONS: ItemVisibility[] = ['everyone', 'private', 'custom'];
export const RECURRING_PRESETS: RecurringRule[] = [
  { frequency: 'none' },
  { frequency: 'daily' },
  { frequency: 'weekly' },
  { frequency: 'monthly' },
  { frequency: 'yearly' },
  { frequency: 'custom', interval: 2, unit: 'weeks' },
];
