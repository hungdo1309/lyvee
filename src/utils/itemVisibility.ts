import { Item, ItemVisibility } from '../types';

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

type VisibleToInput = Pick<
  Item,
  'visibility' | 'allowedMembers' | 'assignedTo' | 'createdBy'
>;

/** User IDs allowed to see this item in Firestore queries and rules. */
export function computeVisibleTo(
  item: VisibleToInput,
  groupMembers: string[]
): string[] {
  const alwaysVisible = uniqueIds([item.createdBy, ...item.assignedTo]);

  switch (item.visibility) {
    case 'everyone':
      return uniqueIds([...groupMembers, ...alwaysVisible]);
    case 'private':
      return alwaysVisible;
    case 'custom':
      return uniqueIds([...alwaysVisible, ...item.allowedMembers]);
    default:
      return alwaysVisible;
  }
}

export function itemNeedsVisibleToBackfill(item: Item): boolean {
  return (
    (item.visibility === 'private' || item.visibility === 'custom') &&
    (!item.visibleTo || item.visibleTo.length === 0)
  );
}

/**
 * Whether a group member can see an item.
 * Visibility = the chosen visibility setting, plus the creator and anyone assigned.
 */
export function isItemVisibleToMember(item: Item, userId: string): boolean {
  if (item.assignedTo.includes(userId)) return true;
  if (item.createdBy === userId) return true;

  switch (item.visibility) {
    case 'everyone':
      return true;
    case 'private':
      return false;
    case 'custom':
      return item.allowedMembers.includes(userId);
    default:
      return false;
  }
}

export function filterVisibleItems(items: Item[], userId: string): Item[] {
  return items.filter((item) => isItemVisibleToMember(item, userId));
}
