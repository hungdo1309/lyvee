import { Item } from '../types';
import { isItemVisibleToMember } from './itemFilters';

/**
 * Whether a user should receive local reminders for an item.
 * - Respects visibility (must be able to see the item)
 * - If assignees exist, only assignees and the creator are notified
 */
export function shouldNotifyUser(item: Item, userId: string): boolean {
  if (!item.dateTime) return false;
  if (!isItemVisibleToMember(item, userId)) return false;

  if (item.assignedTo.length > 0) {
    return item.assignedTo.includes(userId) || item.createdBy === userId;
  }

  return true;
}

export function getItemsForNotification(
  items: Item[],
  userId: string
): Item[] {
  return items.filter((item) => shouldNotifyUser(item, userId));
}
