import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Item, ItemInput, ItemType, ItemVisibility, RecurringRule, DEFAULT_RECURRING_RULE } from '../types';
import { itemTypeSupportsRecurring } from '../constants/theme';
import { toOccurrenceKey } from '../utils/recurrence';
import { normalizeTags } from '../utils/tags';
import { filterVisibleItems, isItemVisibleToMember } from '../utils/itemVisibility';

export { filterVisibleItems, isItemVisibleToMember };

function normalizeItemInput(input: ItemInput): ItemInput {
  const recurringRule = itemTypeSupportsRecurring(input.type)
    ? input.recurringRule
    : DEFAULT_RECURRING_RULE;

  return {
    ...input,
    title: input.title.trim(),
    notes: input.notes.trim(),
    tags: normalizeTags(input.tags ?? []),
    allowedMembers: input.visibility === 'custom' ? input.allowedMembers : [],
    completedOccurrences: input.completedOccurrences ?? [],
    recurringRule,
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
  userId: string
): Promise<Item> {
  const normalized = normalizeItemInput(input);
  const error = validateItemInput(normalized);
  if (error) throw new Error(error);

  const id = normalized.id ?? doc(collection(db, 'items')).id;
  const now = new Date().toISOString();
  const item: Item = {
    ...normalized,
    id,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'items', id), item);
  return item;
}

export async function updateItem(
  itemId: string,
  updates: Partial<ItemInput>
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.notes !== undefined) payload.notes = updates.notes.trim();
  if (updates.tags !== undefined) payload.tags = normalizeTags(updates.tags);
  if (updates.visibility !== undefined && updates.visibility !== 'custom') {
    payload.allowedMembers = [];
  }
  if (updates.type === 'document') {
    payload.recurringRule = DEFAULT_RECURRING_RULE;
  }
  await setDoc(doc(db, 'items', itemId), payload, { merge: true });
}

export async function deleteItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'items', itemId));
}

export async function deleteItemsForGroup(groupId: string): Promise<void> {
  const q = query(collection(db, 'items'), where('groupId', '==', groupId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

export async function getItem(itemId: string): Promise<Item | null> {
  const snap = await getDoc(doc(db, 'items', itemId));
  if (!snap.exists()) return null;
  return snap.data() as Item;
}

export function subscribeToItem(
  itemId: string,
  callback: (item: Item | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'items', itemId),
    (snap) => {
      callback(snap.exists() ? (snap.data() as Item) : null);
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
  occurrenceDate?: string
): Promise<void> {
  if (item.type !== 'task') return;

  if (item.recurringRule.frequency === 'none' || !occurrenceDate) {
    await updateItem(item.id, { completed: !item.completed });
    return;
  }

  const key = toOccurrenceKey(occurrenceDate);
  const current = item.completedOccurrences ?? [];
  const completedOccurrences = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key];

  await updateItem(item.id, { completedOccurrences });
}

export function subscribeToGroupItems(
  groupId: string,
  userId: string,
  callback: (items: Item[]) => void
): () => void {
  const q = query(
    collection(db, 'items'),
    where('groupId', '==', groupId),
    orderBy('dateTime', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data() as Item)
        .filter((item) => isItemVisibleToMember(item, userId));
      callback(items);
    },
    (error) => {
      console.warn('[items] subscribeToGroupItems:', error.code, error.message);
      callback([]);
    }
  );
}

export function subscribeToAllUserItems(
  groupIds: string[],
  userId: string,
  callback: (items: Item[]) => void
): () => void {
  if (groupIds.length === 0) {
    callback([]);
    return () => {};
  }

  const unsubscribers: (() => void)[] = [];
  const itemsByGroup = new Map<string, Item[]>();

  const emit = () => {
    const allItems = Array.from(itemsByGroup.values()).flat();
    callback(
      allItems.sort((a, b) => {
        if (!a.dateTime && !b.dateTime) return 0;
        if (!a.dateTime) return 1;
        if (!b.dateTime) return -1;
        return a.dateTime.localeCompare(b.dateTime);
      })
    );
  };

  for (const groupId of groupIds) {
    const q = query(
      collection(db, 'items'),
      where('groupId', '==', groupId)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => d.data() as Item)
          .filter((item) => isItemVisibleToMember(item, userId));
        itemsByGroup.set(groupId, items);
        emit();
      },
      (error) => {
        console.warn(
          `[items] subscribeToAllUserItems (${groupId}):`,
          error.code,
          error.message
        );
        itemsByGroup.set(groupId, []);
        emit();
      }
    );
    unsubscribers.push(unsub);
  }

  return () => unsubscribers.forEach((u) => u());
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
