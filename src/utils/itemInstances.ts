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
  format,
} from 'date-fns';
import { Item } from '../types';
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
  options: { includeExpired?: boolean } = {}
): ItemInstance[] {
  const { includeExpired = true } = options;
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return filterCalendarInstancesByStatus(
    expandItems(items, dayStart, new Date(dayEnd.getTime() - 1)),
    includeExpired
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

function sortItemListInstances(instances: ItemInstance[]): ItemInstance[] {
  return [...instances].sort((a, b) => {
    if (!a.occurrenceDate && !b.occurrenceDate) {
      return a.item.title.localeCompare(b.item.title);
    }
    if (!a.occurrenceDate) return 1;
    if (!b.occurrenceDate) return -1;
    return a.occurrenceDate.localeCompare(b.occurrenceDate);
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
      title: 'Expired',
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
  return !isBefore(parseISO(instance.occurrenceDate), startOfDay(new Date()));
}

export function filterCalendarInstancesByStatus(
  instances: ItemInstance[],
  includeExpired: boolean
): ItemInstance[] {
  if (includeExpired) return instances;
  return instances.filter((instance) => isCalendarInstanceActive(instance));
}

export function getMonthInstanceCounts(
  items: Item[],
  month: Date,
  options: { includeExpired?: boolean } = {}
): MonthInstanceCounts {
  const { includeExpired = true } = options;
  const instances = filterCalendarInstancesByStatus(
    expandItems(items, startOfMonth(month), endOfMonth(month)),
    includeExpired
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

export function getMarkedDatesFromItems(
  items: Item[],
  month: Date,
  options: { includeExpired?: boolean } = {}
): Record<string, { marked: boolean; dots?: { color: string }[] }> {
  const { includeExpired = true } = options;
  const rangeStart = startOfMonth(month);
  const rangeEnd = endOfMonth(month);
  const instances = filterCalendarInstancesByStatus(
    expandItems(items, rangeStart, rangeEnd),
    includeExpired
  );
  const marked: Record<string, { marked: boolean; dots?: { color: string }[] }> = {};

  for (const instance of instances) {
    const key = format(parseISO(instance.occurrenceDate), 'yyyy-MM-dd');
    if (!marked[key]) {
      marked[key] = { marked: true, dots: [] };
    }
    const color = itemTypeConfig[instance.item.type].color;
    if ((marked[key].dots?.length ?? 0) < 3) {
      marked[key].dots!.push({ color });
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
