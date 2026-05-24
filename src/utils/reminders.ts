import {
  Item,
  ItemReminderOffset,
  ItemType,
  User,
  defaultReminderForType,
} from '../types';
import { getFirstName } from './names';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function reminderOffsetToMs(offset: ItemReminderOffset): number | null {
  switch (offset) {
    case 'none':
      return null;
    case 'at_time':
      return 0;
    case '1h':
      return HOUR_MS;
    case '24h':
      return DAY_MS;
    case '3d':
      return 3 * DAY_MS;
    case '7d':
      return 7 * DAY_MS;
    case '14d':
      return 14 * DAY_MS;
    case '30d':
      return 30 * DAY_MS;
    default:
      return null;
  }
}

/** Offsets used when scheduling notifications (legacy items without a field keep 24h + 1h). */
export function getReminderOffsetsForItem(item: Item): ItemReminderOffset[] {
  if (!item.dateTime) return [];
  if (item.reminderOffset === 'none') return [];
  if (item.reminderOffset) return [item.reminderOffset];
  return ['24h', '1h'];
}

export function resolveItemReminderOffset(
  item: Pick<Item, 'dateTime' | 'reminderOffset' | 'type'>
): ItemReminderOffset {
  if (!item.dateTime) return 'none';
  if (item.reminderOffset !== undefined) return item.reminderOffset;
  return '24h';
}

export function normalizeReminderOffset(
  hasDate: boolean,
  type: ItemType,
  offset: ItemReminderOffset | undefined
): ItemReminderOffset {
  if (!hasDate) return 'none';
  if (offset !== undefined) return offset;
  return defaultReminderForType(type);
}

export function getReminderAudienceHint(
  assignedTo: string[],
  groupMembers: User[]
): string {
  if (assignedTo.length === 0) {
    return 'Reminds everyone who can see this item when notifications are on.';
  }

  const names = assignedTo
    .map((id) => groupMembers.find((member) => member.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .map(getFirstName);

  if (names.length === 0) {
    return 'Reminds assigned members when notifications are on.';
  }

  if (names.length === 1) {
    return `Reminds ${names[0]} on their device when notifications are on.`;
  }

  if (names.length === 2) {
    return `Reminds ${names[0]} and ${names[1]} on their devices when notifications are on.`;
  }

  return `Reminds ${names.slice(0, 2).join(', ')} +${names.length - 2} more when notifications are on.`;
}
