import { Item } from '../types';
import { itemMatchesTagFilter } from './tags';
import { isItemVisibleToMember } from './itemVisibility';

export { isItemVisibleToMember } from './itemVisibility';

/** Who can see items: all, current user, or a specific member id */
export type VisibilityMemberFilter = 'all' | 'myself' | string;

export interface CalendarFilters {
  visibilityMember: VisibilityMemberFilter;
  assigneeId: string | 'all' | 'unassigned';
  tags: string[];
  showExpired: boolean;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  visibilityMember: 'all',
  assigneeId: 'all',
  tags: [],
  showExpired: false,
};

export function filterItemsByCalendarFilters(
  items: Item[],
  filters: CalendarFilters,
  userId?: string
): Item[] {
  return items.filter((item) => {
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
    filters.visibilityMember !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.tags.length > 0 ||
    filters.showExpired
  );
}
