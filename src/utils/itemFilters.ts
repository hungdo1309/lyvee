import { Item, ItemType } from '../types';
import { itemMatchesTagFilter } from './tags';
import { isItemVisibleToMember } from './itemVisibility';

export { isItemVisibleToMember } from './itemVisibility';

export type ItemTypeFilter = ItemType | 'all';

export interface ItemTypeTagFilters {
  type: ItemTypeFilter;
  tags: string[];
}

export const DEFAULT_ITEM_TYPE_TAG_FILTERS: ItemTypeTagFilters = {
  type: 'all',
  tags: [],
};

export function filterItemsByTypeAndTags(
  items: Item[],
  filters: ItemTypeTagFilters
): Item[] {
  return items.filter((item) => {
    if (filters.type !== 'all' && item.type !== filters.type) {
      return false;
    }
    if (!itemMatchesTagFilter(item, filters.tags)) {
      return false;
    }
    return true;
  });
}

export function hasActiveItemTypeTagFilters(filters: ItemTypeTagFilters): boolean {
  return filters.type !== 'all' || filters.tags.length > 0;
}

/** Who can see items: all, current user, or a specific member id */
export type VisibilityMemberFilter = 'all' | 'myself' | string;

export interface CalendarFilters {
  type: ItemTypeFilter;
  visibilityMember: VisibilityMemberFilter;
  assigneeId: string | 'all' | 'unassigned';
  tags: string[];
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  type: 'all',
  visibilityMember: 'all',
  assigneeId: 'all',
  tags: [],
};

export function filterItemsByCalendarFilters(
  items: Item[],
  filters: CalendarFilters,
  userId?: string
): Item[] {
  return items.filter((item) => {
    if (filters.type !== 'all' && item.type !== filters.type) {
      return false;
    }

    if (filters.visibilityMember === 'myself') {
      if (!userId || !isItemVisibleToMember(item, userId)) {
        return false;
      }
    } else if (filters.visibilityMember !== 'all') {
      if (!isItemVisibleToMember(item, filters.visibilityMember)) {
        return false;
      }
    }

    if (filters.assigneeId === 'unassigned') {
      if (item.assignedTo.length > 0) return false;
    } else if (filters.assigneeId !== 'all') {
      if (!item.assignedTo.includes(filters.assigneeId)) return false;
    }

    if (!itemMatchesTagFilter(item, filters.tags)) {
      return false;
    }

    return true;
  });
}

export function hasActiveCalendarFilters(filters: CalendarFilters): boolean {
  return (
    filters.type !== 'all' ||
    filters.visibilityMember !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.tags.length > 0
  );
}
