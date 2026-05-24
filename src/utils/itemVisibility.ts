import { Item } from '../types';

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
