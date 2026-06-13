import {
  addDays,
  addMonths,
  addYears,
  startOfMonth,
  endOfMonth,
  endOfDay,
  startOfDay,
  parseISO,
  isSameDay,
  isBefore,
  isAfter,
  format,
} from 'date-fns';
import { Group, Item } from '../types';
import { itemTypeConfig } from '../constants/theme';
import {
  getOccurrencesInRange,
  getUpcomingOccurrences,
  getNextOccurrence,
  mergeOccurrenceDateTime,
  toOccurrenceKey,
} from './recurrence';

/** A single schedulable occurrence of an Item (virtual — not stored separately). */
export interface ItemInstance {
  itemId: string;
  instanceKey: string;
  occurrenceDate: string;
  isRecurring: boolean;
  completed: boolean;
  item: Item;
}

export interface CalendarInstanceFilterOptions {
  includeExpired?: boolean;
  /** Keep completed instances visible when includeExpired is false (Home-style). */
  alwaysIncludeCompleted?: boolean;
}

function isOccurrenceCompleted(item: Item, occurrenceKey: string): boolean {
  if (item.recurringRule.frequency === 'none') {
    return item.completed;
  }
  return (item.completedOccurrences ?? []).includes(occurrenceKey);
}

function buildInstance(item: Item, occurrence: Date): ItemInstance {
  const occurrenceDate = mergeOccurrenceDateTime(item.dateTime!, occurrence);
  const occurrenceKey = toOccurrenceKey(occurrence);
  const isRecurring = item.recurringRule.frequency !== 'none';

  return {
    itemId: item.id,
    instanceKey: isRecurring ? `${item.id}_${occurrenceKey}` : item.id,
    occurrenceDate,
    isRecurring,
    completed: isOccurrenceCompleted(item, occurrenceKey),
    item: {
      ...item,
      dateTime: occurrenceDate,
      completed: isOccurrenceCompleted(item, occurrenceKey),
    },
  };
}

export function expandItem(
  item: Item,
  rangeStart: Date,
  rangeEnd: Date
): ItemInstance[] {
  if (!item.dateTime) return [];

  if (item.recurringRule.frequency === 'none') {
    const date = parseISO(item.dateTime);
    if (date >= rangeStart && date <= rangeEnd) {
      return [buildInstance(item, date)];
    }
    return [];
  }

  return getOccurrencesInRange(
    item.dateTime,
    item.recurringRule,
    rangeStart,
    rangeEnd
  ).map((occ) => buildInstance(item, occ));
}

export function expandItems(
  items: Item[],
  rangeStart: Date,
  rangeEnd: Date
): ItemInstance[] {
  const instances = items.flatMap((item) => expandItem(item, rangeStart, rangeEnd));
  return instances.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
}

export function getInstancesForDate(
  items: Item[],
  date: Date,
  options: CalendarInstanceFilterOptions = {}
): ItemInstance[] {
  const { includeExpired = true, alwaysIncludeCompleted = false } = options;
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return filterCalendarInstancesByStatus(
    expandItems(items, dayStart, new Date(dayEnd.getTime() - 1)),
    { includeExpired, alwaysIncludeCompleted }
  );
}

export function getUpcomingInstances(
  items: Item[],
  daysAhead: number = 60,
  includeUndated: boolean = true
): ItemInstance[] {
  const now = startOfDay(new Date());
  const rangeEnd = addDays(now, daysAhead);

  const dated = expandItems(
    items.filter((i) => i.dateTime),
    now,
    rangeEnd
  );

  const undated: ItemInstance[] = includeUndated
    ? items
        .filter((i) => !i.dateTime)
        .map((item) => ({
          itemId: item.id,
          instanceKey: item.id,
          occurrenceDate: '',
          isRecurring: false,
          completed: item.completed,
          item,
        }))
    : [];

  return [...dated, ...undated];
}

export const HOME_UPCOMING_DAYS = 14;

export function isOccurrenceDateWithinDayWindow(
  occurrenceDate: string,
  daysAhead: number = HOME_UPCOMING_DAYS
): boolean {
  const day = startOfDay(parseISO(occurrenceDate));
  const today = startOfDay(new Date());
  const lastDay = startOfDay(addDays(today, daysAhead - 1));
  return !isBefore(day, today) && !isAfter(day, lastDay);
}

/** Upcoming dated instances within a calendar-day window (excludes undated items). */
export function getUpcomingWindowInstances(
  items: Item[],
  daysAhead: number = HOME_UPCOMING_DAYS,
  options: { includeExpired?: boolean } = {}
): ItemInstance[] {
  const { includeExpired = false } = options;
  const today = startOfDay(new Date());
  const rangeEnd = endOfDay(addDays(today, daysAhead - 1));

  const instances = filterCalendarInstancesByStatus(
    expandItems(
      items.filter((item) => item.dateTime),
      today,
      rangeEnd
    ),
    includeExpired
  );

  return instances.filter(
    (instance) =>
      instance.occurrenceDate &&
      isOccurrenceDateWithinDayWindow(instance.occurrenceDate, daysAhead)
  );
}

export function getEarliestUpcomingInstance(
  items: Item[],
  daysAhead: number = 365
): ItemInstance | null {
  const instances = getUpcomingWindowInstances(items, daysAhead, {
    includeExpired: false,
  });
  if (instances.length === 0) return null;
  return sortItemListInstances(instances)[0];
}

export function getGroupIdWithEarliestUpcoming(
  groups: Group[],
  items: Item[]
): string {
  if (groups.length === 0) {
    throw new Error('At least one group is required');
  }

  let bestGroupId = groups[0].id;
  let bestDateKey: string | null = null;

  for (const group of groups) {
    const earliest = getEarliestUpcomingInstance(
      items.filter((item) => item.groupId === group.id)
    );
    if (!earliest?.occurrenceDate) continue;

    const dateKey = format(parseISO(earliest.occurrenceDate), 'yyyy-MM-dd');
    if (
      !bestDateKey ||
      dateKey < bestDateKey ||
      (dateKey === bestDateKey && group.id.localeCompare(bestGroupId) < 0)
    ) {
      bestDateKey = dateKey;
      bestGroupId = group.id;
    }
  }

  return bestGroupId;
}

export interface HomeUpcomingDaySection {
  dateKey: string;
  instances: ItemInstance[];
}

export function buildHomeUpcomingDaySections(
  instances: ItemInstance[],
  daysAhead: number = HOME_UPCOMING_DAYS
): HomeUpcomingDaySection[] {
  const today = startOfDay(new Date());
  const grouped = new Map<string, ItemInstance[]>();

  for (const instance of instances) {
    if (!instance.occurrenceDate) continue;
    const dateKey = format(parseISO(instance.occurrenceDate), 'yyyy-MM-dd');
    const bucket = grouped.get(dateKey) ?? [];
    bucket.push(instance);
    grouped.set(dateKey, bucket);
  }

  return Array.from({ length: daysAhead }, (_, index) => {
    const dateKey = format(addDays(today, index), 'yyyy-MM-dd');
    return {
      dateKey,
      instances: sortItemListInstances(grouped.get(dateKey) ?? []),
    };
  });
}

export interface UpcomingInstanceSection {
  dateKey: string;
  title: string;
  data: ItemInstance[];
}

export function groupUpcomingInstancesByDate(
  instances: ItemInstance[],
  formatTitle: (dateKey: string) => string
): UpcomingInstanceSection[] {
  const grouped = new Map<string, ItemInstance[]>();

  for (const instance of instances) {
    if (!instance.occurrenceDate) continue;
    const dateKey = format(parseISO(instance.occurrenceDate), 'yyyy-MM-dd');
    const bucket = grouped.get(dateKey) ?? [];
    bucket.push(instance);
    grouped.set(dateKey, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, data]) => ({
      dateKey,
      title: formatTitle(dateKey),
      data: sortItemListInstances(data),
    }));
}

export function sortItemListInstances(instances: ItemInstance[]): ItemInstance[] {
  return [...instances].sort((a, b) => {
    if (!a.occurrenceDate && !b.occurrenceDate) {
      return a.item.title.localeCompare(b.item.title);
    }
    if (!a.occurrenceDate) return 1;
    if (!b.occurrenceDate) return -1;
    return a.occurrenceDate.localeCompare(b.occurrenceDate);
  });
}

export function sortItemListInstancesLatestFirst(instances: ItemInstance[]): ItemInstance[] {
  return [...instances].sort((a, b) => {
    if (!a.occurrenceDate && !b.occurrenceDate) {
      return b.item.title.localeCompare(a.item.title);
    }
    if (!a.occurrenceDate) return 1;
    if (!b.occurrenceDate) return -1;
    return b.occurrenceDate.localeCompare(a.occurrenceDate);
  });
}

function buildUndatedInstance(item: Item): ItemInstance {
  return {
    itemId: item.id,
    instanceKey: item.id,
    occurrenceDate: '',
    isRecurring: false,
    completed: item.completed,
    item,
  };
}

function getLastPastOccurrence(item: Item, before: Date): Date | null {
  if (!item.dateTime) return null;

  const beforeDay = startOfDay(before);

  if (item.recurringRule.frequency === 'none') {
    const date = parseISO(item.dateTime);
    return isBefore(date, beforeDay) ? date : null;
  }

  const rangeEnd = addDays(beforeDay, -1);
  if (rangeEnd < addYears(beforeDay, -10)) return null;

  const occurrences = getOccurrencesInRange(
    item.dateTime,
    item.recurringRule,
    addYears(beforeDay, -5),
    endOfDay(rangeEnd)
  );

  return occurrences.length > 0 ? occurrences[occurrences.length - 1] : null;
}

/** Next/current occurrence for the Items tab (undated and recurring-with-upcoming included). */
export function getActiveListInstance(item: Item): ItemInstance | null {
  if (!item.dateTime) {
    if (item.completed) return null;
    return buildUndatedInstance(item);
  }

  const todayStart = startOfDay(new Date());

  if (item.recurringRule.frequency === 'none') {
    if (item.completed) return null;
    const date = parseISO(item.dateTime);
    if (isBefore(date, todayStart)) return null;
    return buildInstance(item, date);
  }

  const next = getNextOccurrence(item.dateTime, item.recurringRule, todayStart);
  if (!next) return null;
  return buildInstance(item, next);
}

/** Past/completed one-time items or recurring items with no upcoming occurrence. */
export function getExpiredListInstance(item: Item): ItemInstance | null {
  if (!item.dateTime) {
    if (item.completed) {
      return buildUndatedInstance(item);
    }
    return null;
  }

  const todayStart = startOfDay(new Date());

  if (item.recurringRule.frequency === 'none') {
    const date = parseISO(item.dateTime);
    if (item.completed || isBefore(date, todayStart)) {
      return buildInstance(item, date);
    }
    return null;
  }

  if (getNextOccurrence(item.dateTime, item.recurringRule, todayStart)) {
    return null;
  }

  const lastPast = getLastPastOccurrence(item, todayStart);
  if (!lastPast) return null;
  return buildInstance(item, lastPast);
}

export interface ItemListSection {
  key: 'active' | 'expired';
  title: string;
  data: ItemInstance[];
}

export function getGroupItemListSections(
  items: Item[],
  options: { includeExpired?: boolean } = {}
): ItemListSection[] {
  const { includeExpired = false } = options;
  const active: ItemInstance[] = [];
  const expired: ItemInstance[] = [];

  for (const item of items) {
    const activeInstance = getActiveListInstance(item);
    if (activeInstance) {
      active.push(activeInstance);
      continue;
    }

    if (includeExpired) {
      const expiredInstance = getExpiredListInstance(item);
      if (expiredInstance) {
        expired.push(expiredInstance);
      }
    }
  }

  const sections: ItemListSection[] = [
    { key: 'active', title: 'Active', data: sortItemListInstances(active) },
  ];

  if (includeExpired && expired.length > 0) {
    sections.push({
      key: 'expired',
      title: 'Completed',
      data: sortItemListInstances(expired),
    });
  }

  return sections.filter((section) => section.data.length > 0);
}

/** Flat list of item rows for the Items tab. */
export function getGroupItemListInstances(
  items: Item[],
  options: { includeExpired?: boolean } = {}
): ItemInstance[] {
  return getGroupItemListSections(items, options).flatMap((section) => section.data);
}

export function countActiveItems(items: Item[]): number {
  return items.reduce(
    (count, item) => count + (getActiveListInstance(item) ? 1 : 0),
    0
  );
}

export function countExpiredItems(items: Item[]): number {
  return items.reduce(
    (count, item) =>
      count + (!getActiveListInstance(item) && getExpiredListInstance(item) ? 1 : 0),
    0
  );
}

export function formatGroupItemCounts(active: number, expired: number): string {
  if (active === 0 && expired === 0) return 'No items';
  if (expired === 0) return `${active} active`;
  if (active === 0) return `${expired} expired`;
  return `${active} active, ${expired} expired`;
}

export function formatActiveItemCount(count: number): string {
  return `${count} active item${count === 1 ? '' : 's'}`;
}

export interface MonthInstanceCounts {
  total: number;
  active: number;
  expired: number;
}

export function isCalendarInstanceActive(instance: ItemInstance): boolean {
  if (instance.completed) return false;
  if (!instance.occurrenceDate) return true;
  return !isBefore(parseISO(instance.occurrenceDate), new Date());
}

/** Incomplete instance whose scheduled date-time has already passed. */
export function isOverdueCalendarInstance(instance: ItemInstance): boolean {
  if (instance.completed) return false;
  if (!instance.occurrenceDate) return false;
  return isBefore(parseISO(instance.occurrenceDate), new Date());
}

export function hasOverdueInstances(instances: ItemInstance[]): boolean {
  return instances.some(isOverdueCalendarInstance);
}

/** Match overdue push lookback — avoids unbounded recurring missed occurrences. */
export const HOME_OVERDUE_LOOKBACK_DAYS = 30;

export function getOverdueTaskInstances(
  items: Item[],
  lookbackDays: number = HOME_OVERDUE_LOOKBACK_DAYS
): ItemInstance[] {
  const now = new Date();
  const rangeStart = addDays(startOfDay(now), -lookbackDays);

  const instances = expandItems(
    items.filter((item) => item.type === 'task' && item.dateTime),
    rangeStart,
    now
  );

  return sortItemListInstancesLatestFirst(instances.filter(isOverdueCalendarInstance));
}

export function filterCalendarInstancesByStatus(
  instances: ItemInstance[],
  options: CalendarInstanceFilterOptions | boolean = {}
): ItemInstance[] {
  const { includeExpired = true, alwaysIncludeCompleted = false } =
    typeof options === 'boolean' ? { includeExpired: options } : options;

  if (includeExpired) return instances;
  if (alwaysIncludeCompleted) {
    return instances.filter(
      (instance) => instance.completed || isCalendarInstanceActive(instance)
    );
  }
  return instances.filter((instance) => isCalendarInstanceActive(instance));
}

export function getMonthInstanceCounts(
  items: Item[],
  month: Date,
  options: CalendarInstanceFilterOptions = {}
): MonthInstanceCounts {
  const { includeExpired = true, alwaysIncludeCompleted = false } = options;
  const instances = filterCalendarInstancesByStatus(
    expandItems(items, startOfMonth(month), endOfMonth(month)),
    { includeExpired, alwaysIncludeCompleted }
  );
  let active = 0;
  let expired = 0;

  for (const instance of instances) {
    if (isCalendarInstanceActive(instance)) {
      active += 1;
    } else {
      expired += 1;
    }
  }

  return { total: instances.length, active, expired };
}

export function formatMonthItemSummary(month: Date, counts: MonthInstanceCounts): string {
  const monthLabel = format(month, 'MMMM yyyy');

  if (counts.total === 0) {
    return `No items in ${monthLabel}`;
  }

  const itemLabel = `${counts.total} item${counts.total === 1 ? '' : 's'} in ${monthLabel}`;

  if (counts.expired === 0) {
    return `${itemLabel} (${counts.active} active)`;
  }
  if (counts.active === 0) {
    return `${itemLabel} (${counts.expired} expired)`;
  }

  return `${itemLabel} (${counts.active} active, ${counts.expired} expired)`;
}

export function getNextInstance(item: Item): ItemInstance | null {
  if (!item.dateTime) return null;

  if (item.recurringRule.frequency === 'none') {
    const date = parseISO(item.dateTime);
    return buildInstance(item, date);
  }

  const upcoming = getUpcomingOccurrences(
    item.dateTime,
    item.recurringRule,
    1,
    new Date()
  );
  if (upcoming.length === 0) return null;
  return buildInstance(item, upcoming[0]);
}

export interface CalendarMarkedDate {
  marked: boolean;
  dots?: { color: string }[];
  overdue?: boolean;
}

export function getMarkedDatesFromItems(
  items: Item[],
  month: Date,
  options: CalendarInstanceFilterOptions = {}
): Record<string, CalendarMarkedDate> {
  const { includeExpired = true, alwaysIncludeCompleted = false } = options;
  const rangeStart = startOfMonth(month);
  const rangeEnd = endOfMonth(month);
  const instances = filterCalendarInstancesByStatus(
    expandItems(items, rangeStart, rangeEnd),
    { includeExpired, alwaysIncludeCompleted }
  );
  const marked: Record<string, CalendarMarkedDate> = {};

  for (const instance of instances) {
    const key = format(parseISO(instance.occurrenceDate), 'yyyy-MM-dd');
    if (!marked[key]) {
      marked[key] = { marked: true, dots: [], overdue: false };
    }
    const color = itemTypeConfig[instance.item.type].color;
    if ((marked[key].dots?.length ?? 0) < 3) {
      marked[key].dots!.push({ color });
    }
    if (isOverdueCalendarInstance(instance)) {
      marked[key].overdue = true;
    }
  }

  return marked;
}

export function itemOccursOnDate(item: Item, date: Date): boolean {
  return getInstancesForDate([item], date).length > 0;
}

export function isSameOccurrence(
  instance: ItemInstance,
  occurrenceDate: string
): boolean {
  if (!instance.occurrenceDate) return false;
  return isSameDay(parseISO(instance.occurrenceDate), parseISO(occurrenceDate));
}
