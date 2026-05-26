import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { addDays, isBefore, parseISO } from 'date-fns';
import { Item, ItemReminderOffset, getReminderOptionLabel } from '../types';
import { expandItem } from '../utils/itemInstances';
import { getItemsForNotification } from '../utils/notificationRules';
import { formatRecurringLabel } from '../utils/recurrence';
import {
  getReminderOffsetsForItem,
  reminderOffsetToMs,
} from '../utils/reminders';

export { formatRecurringLabel } from '../utils/recurrence';

/** iOS caps local notifications; schedule the nearest reminders first. */
const MAX_SCHEDULED_NOTIFICATIONS = 58;
const SCHEDULE_HORIZON_DAYS = 90;

export interface ReminderPayload {
  itemId: string;
  groupId: string;
  occurrence: string;
  reminder: ItemReminderOffset;
}

interface PendingReminder {
  item: Item;
  occurrenceDate: string;
  triggerDate: Date;
  reminder: ItemReminderOffset;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Lyvee Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      await Notifications.setNotificationChannelAsync('activity', {
        name: 'Lyvee Activity',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  const projectId = getExpoProjectId();
  if (!projectId) return null;

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

function getTypeLabel(item: Item): string {
  switch (item.type) {
    case 'task':
      return 'Task';
    case 'activity':
      return 'Event/Activity';
    case 'document':
      return 'Document';
  }
}

function getReminderTitle(item: Item, reminder: ItemReminderOffset): string {
  const label = getTypeLabel(item);
  if (reminder === 'at_time') return `${label} due now: ${item.title}`;
  if (reminder === '1h') return `${label} in 1 hour: ${item.title}`;
  if (reminder === '24h') return `${label} tomorrow: ${item.title}`;
  const timing = getReminderOptionLabel(reminder).toLowerCase();
  return `${label} (${timing}): ${item.title}`;
}

function getReminderBody(item: Item, reminder: ItemReminderOffset): string {
  const when =
    reminder === 'at_time'
      ? 'Due now'
      : `Due ${getReminderOptionLabel(reminder).toLowerCase()}`;
  const recurring =
    item.recurringRule.frequency !== 'none'
      ? ` · ${formatRecurringLabel(item.recurringRule)}`
      : '';
  const notes = item.notes ? ` — ${item.notes.slice(0, 60)}` : '';
  return `${when}${recurring}${notes}`;
}

function triggerDateForOffset(
  occurrence: Date,
  offset: ItemReminderOffset
): Date | null {
  const ms = reminderOffsetToMs(offset);
  if (ms === null) return null;
  return new Date(occurrence.getTime() - ms);
}

function buildRemindersForItem(item: Item, now: Date): PendingReminder[] {
  if (!item.dateTime) return [];

  const rangeEnd = addDays(now, SCHEDULE_HORIZON_DAYS);
  const instances = expandItem(item, now, rangeEnd);
  const reminders: PendingReminder[] = [];
  const offsets = getReminderOffsetsForItem(item);

  for (const instance of instances) {
    if (instance.completed) continue;

    const occurrence = parseISO(instance.occurrenceDate);

    for (const offset of offsets) {
      const triggerDate = triggerDateForOffset(occurrence, offset);
      if (!triggerDate || isBefore(triggerDate, now)) continue;

      reminders.push({
        item,
        occurrenceDate: instance.occurrenceDate,
        triggerDate,
        reminder: offset,
      });
    }
  }

  return reminders;
}

async function scheduleReminder(pending: PendingReminder): Promise<void> {
  const { item, occurrenceDate, triggerDate, reminder } = pending;
  const data: ReminderPayload = {
    itemId: item.id,
    groupId: item.groupId,
    occurrence: occurrenceDate,
    reminder,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: getReminderTitle(item, reminder),
      body: getReminderBody(item, reminder),
      data: data as unknown as Record<string, unknown>,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

/**
 * Schedules local reminders for upcoming item occurrences visible/assigned to the user.
 * Uses each item's reminder setting (legacy items without one keep 24h + 1h).
 */
export async function syncItemNotifications(
  items: Item[],
  userId: string
): Promise<void> {
  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const eligible = getItemsForNotification(items, userId);

    const allReminders = eligible
      .flatMap((item) => buildRemindersForItem(item, now))
      .sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime())
      .slice(0, MAX_SCHEDULED_NOTIFICATIONS);

    for (const reminder of allReminders) {
      await scheduleReminder(reminder);
    }
  } catch {
    // Local scheduling may be limited in Expo Go.
  }
}

export async function getScheduledReminderCount(): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}
