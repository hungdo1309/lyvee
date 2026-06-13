import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { addDays, isBefore, parseISO } from 'date-fns';
import { Group, Item, ItemReminderOffset, getReminderOptionLabel } from '../types';
import { Trip, TripItineraryEntry } from '../types/trips';
import { APP_NAME } from '../constants/app';
import { expandItem, isOverdueCalendarInstance } from '../utils/itemInstances';
import {
  getItemsForNotification,
  getItemsForOverdueNotification,
} from '../utils/notificationRules';
import { formatRecurringLabel } from '../utils/recurrence';
import {
  getReminderOffsetsForItem,
  reminderOffsetToMs,
} from '../utils/reminders';
import { isAutoFlightEntryId, parseAutoFlightEntryId } from '../utils/tripFlightEntries';
import { getTripsForNotification } from '../utils/tripNotificationRules';
import { buildTripEntryDateTime } from '../utils/tripInstances';

export { formatRecurringLabel } from '../utils/recurrence';

/** iOS caps local notifications; schedule the nearest reminders first. */
const MAX_SCHEDULED_NOTIFICATIONS = 58;
const SCHEDULE_HORIZON_DAYS = 90;
const OVERDUE_PUSH_LOOKBACK_DAYS = 30;
let lastReminderSyncKey = '';
let lastReminderSyncUserId = '';

export type TripReminderKind = 'flight_checkin' | 'flight_airport' | 'plan_start';

export interface ReminderPayload {
  itemId?: string;
  groupId: string;
  occurrence?: string;
  reminder?: ItemReminderOffset;
  tripId?: string;
  entryId?: string;
  dateKey?: string;
  tripReminder?: TripReminderKind;
}

interface PendingItemReminder {
  kind: 'item';
  item: Item;
  occurrenceDate: string;
  triggerDate: Date;
  reminder: ItemReminderOffset;
  isOverdue?: boolean;
}

interface PendingTripReminder {
  kind: 'trip';
  trip: Trip;
  entry: TripItineraryEntry;
  dateKey: string;
  triggerDate: Date;
  tripReminder: TripReminderKind;
}

type PendingReminder = PendingItemReminder | PendingTripReminder;

const FLIGHT_CHECKIN_MS = 24 * 60 * 60 * 1000;
const FLIGHT_AIRPORT_MS = 3 * 60 * 60 * 1000;
const PLAN_START_MS = 30 * 60 * 1000;

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

const NOTIFICATION_PERMISSIONS: Notifications.NotificationPermissionsRequest = {
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
  },
  android: {},
};

function isNotificationPermissionGranted(
  permissions: Notifications.NotificationPermissionsStatus
): boolean {
  return permissions.status === 'granted' || permissions.granted === true;
}

async function configureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('reminders', {
    name: `${APP_NAME} Reminders`,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('activity', {
    name: `${APP_NAME} Activity`,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return isNotificationPermissionGranted(permissions);
  } catch {
    return false;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (isNotificationPermissionGranted(existing)) {
      await configureAndroidNotificationChannels();
      return true;
    }

    const permissions = await Notifications.requestPermissionsAsync(
      NOTIFICATION_PERMISSIONS
    );

    if (!isNotificationPermissionGranted(permissions)) return false;

    await configureAndroidNotificationChannels();
    return true;
  } catch {
    return false;
  }
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  return hasNotificationPermissions();
}

export async function registerForPushNotifications(): Promise<string | null> {
  const projectId = getExpoProjectId();
  if (!projectId || !Device.isDevice) return null;

  const hasPermission = await hasNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

/** Prompts for OS notification permission, then registers push + local reminders. */
export async function enableNotificationsForUser(
  userId: string,
  items: Item[] = [],
  trips: Trip[] = [],
  groups: Group[] = []
): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  const token = await registerForPushNotifications();
  if (token) {
    const { registerPushToken } = await import('./auth');
    await registerPushToken(userId, token);
  }

  if (items.length > 0 || trips.length > 0) {
    lastReminderSyncKey = '';
    await syncScheduleNotifications(items, trips, groups, userId);
  }

  return true;
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
  return `${when}${recurring}`;
}

function triggerDateForOffset(
  occurrence: Date,
  offset: ItemReminderOffset
): Date | null {
  const ms = reminderOffsetToMs(offset);
  if (ms === null) return null;
  return new Date(occurrence.getTime() - ms);
}

function buildRemindersForItem(item: Item, now: Date): PendingItemReminder[] {
  if (!item.dateTime) return [];

  const rangeEnd = addDays(now, SCHEDULE_HORIZON_DAYS);
  const instances = expandItem(item, now, rangeEnd);
  const reminders: PendingItemReminder[] = [];
  const offsets = getReminderOffsetsForItem(item);

  for (const instance of instances) {
    if (instance.completed) continue;

    const occurrence = parseISO(instance.occurrenceDate);

    for (const offset of offsets) {
      const triggerDate = triggerDateForOffset(occurrence, offset);
      if (!triggerDate || isBefore(triggerDate, now)) continue;

      reminders.push({
        kind: 'item',
        item,
        occurrenceDate: instance.occurrenceDate,
        triggerDate,
        reminder: offset,
      });
    }
  }

  return reminders;
}

function getTripReminderCopy(
  trip: Trip,
  entry: TripItineraryEntry,
  tripReminder: TripReminderKind
): { title: string; body: string } {
  if (tripReminder === 'flight_checkin') {
    return {
      title: 'Time to check in for your flight',
      body: `${entry.title} · ${trip.destination}`,
    };
  }

  if (tripReminder === 'flight_airport') {
    return {
      title: 'Head to the airport soon',
      body: `${entry.title} · ${trip.destination}`,
    };
  }

  return {
    title: `${entry.title} starting in 30 mins`,
    body: trip.destination,
  };
}

function buildRemindersForTrip(trip: Trip, now: Date): PendingTripReminder[] {
  const rangeEnd = addDays(now, SCHEDULE_HORIZON_DAYS);
  const reminders: PendingTripReminder[] = [];

  for (const day of trip.days) {
    for (const entry of day.entries) {
      if (!entry.startTime) continue;

      const eventDate = buildTripEntryDateTime(day.date, entry.startTime);
      if (isBefore(eventDate, now) || eventDate > rangeEnd) continue;

      if (isAutoFlightEntryId(entry.id)) {
        const flightKind = parseAutoFlightEntryId(entry.id)?.kind;
        const checkinTrigger = new Date(eventDate.getTime() - FLIGHT_CHECKIN_MS);
        const airportTrigger = new Date(eventDate.getTime() - FLIGHT_AIRPORT_MS);

        if (flightKind === 'depart' && !isBefore(checkinTrigger, now)) {
          reminders.push({
            kind: 'trip',
            trip,
            entry,
            dateKey: day.date,
            triggerDate: checkinTrigger,
            tripReminder: 'flight_checkin',
          });
        }

        if (flightKind === 'depart' && !isBefore(airportTrigger, now)) {
          reminders.push({
            kind: 'trip',
            trip,
            entry,
            dateKey: day.date,
            triggerDate: airportTrigger,
            tripReminder: 'flight_airport',
          });
        }
        continue;
      }

      const planTrigger = new Date(eventDate.getTime() - PLAN_START_MS);
      if (isBefore(planTrigger, now)) continue;

      reminders.push({
        kind: 'trip',
        trip,
        entry,
        dateKey: day.date,
        triggerDate: planTrigger,
        tripReminder: 'plan_start',
      });
    }
  }

  return reminders;
}

function buildOverdueRemindersForItem(item: Item, now: Date): PendingItemReminder[] {
  if (item.type !== 'task' || !item.dateTime) return [];

  const rangeEnd = addDays(now, SCHEDULE_HORIZON_DAYS);
  const instances = expandItem(item, now, rangeEnd);
  const reminders: PendingItemReminder[] = [];

  for (const instance of instances) {
    if (instance.completed) continue;

    const occurrence = parseISO(instance.occurrenceDate);
    if (isBefore(occurrence, now)) continue;

    reminders.push({
      kind: 'item',
      item,
      occurrenceDate: instance.occurrenceDate,
      triggerDate: occurrence,
      reminder: 'at_time',
      isOverdue: true,
    });
  }

  return reminders;
}

async function processOverdueTaskNotifications(
  items: Item[],
  actorUserId: string
): Promise<void> {
  const now = new Date();
  const rangeStart = addDays(now, -OVERDUE_PUSH_LOOKBACK_DAYS);
  const { tryClaimOverdueNotificationLock } = await import('./overdueNotificationLocks');
  const { notifyTaskOverdue } = await import('./itemNotifications');

  for (const item of items) {
    if (item.type !== 'task' || !item.dateTime) continue;

    const instances = expandItem(item, rangeStart, now);
    for (const instance of instances) {
      if (!isOverdueCalendarInstance(instance)) continue;

      const claimed = await tryClaimOverdueNotificationLock(
        item.id,
        instance.occurrenceDate,
        item.groupId,
        actorUserId
      );
      if (!claimed) continue;

      await notifyTaskOverdue(item, instance.occurrenceDate, actorUserId);
    }
  }
}

async function scheduleReminder(pending: PendingReminder): Promise<void> {
  if (pending.kind === 'trip') {
    const { trip, entry, dateKey, triggerDate, tripReminder } = pending;
    const copy = getTripReminderCopy(trip, entry, tripReminder);
    const data: ReminderPayload = {
      groupId: trip.groupId,
      tripId: trip.id,
      entryId: entry.id,
      dateKey,
      tripReminder,
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: data as unknown as Record<string, unknown>,
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return;
  }

  const { item, occurrenceDate, triggerDate, reminder, isOverdue } = pending;
  const data: ReminderPayload = {
    itemId: item.id,
    groupId: item.groupId,
    occurrence: occurrenceDate,
    reminder,
  };

  const title = isOverdue
    ? `Task overdue: ${item.title}`
    : getReminderTitle(item, reminder);
  const body = isOverdue
    ? 'This task is now overdue'
    : getReminderBody(item, reminder);

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as unknown as Record<string, unknown>,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

function buildReminderSyncKey(reminders: PendingReminder[]): string {
  return reminders
    .map((reminder) => {
      if (reminder.kind === 'trip') {
        return `trip:${reminder.trip.id}:${reminder.entry.id}:${reminder.dateKey}:${reminder.tripReminder}:${reminder.triggerDate.toISOString()}`;
      }
      return `item:${reminder.item.id}:${reminder.occurrenceDate}:${reminder.isOverdue ? 'overdue' : reminder.reminder}:${reminder.triggerDate.toISOString()}`;
    })
    .join('|');
}

/**
 * Schedules local reminders for upcoming item occurrences visible/assigned to the user.
 * Uses each item's reminder setting (legacy items without one keep 24h + 1h).
 */
export async function syncScheduleNotifications(
  items: Item[],
  trips: Trip[],
  groups: Group[],
  userId: string
): Promise<void> {
  const hasPermission = await hasNotificationPermissions();
  if (!hasPermission) return;

  if (userId !== lastReminderSyncUserId) {
    lastReminderSyncUserId = userId;
    lastReminderSyncKey = '';
  }

  try {
    const now = new Date();
    const eligible = getItemsForNotification(items, userId);
    const overdueEligible = getItemsForOverdueNotification(items, userId);
    const eligibleTrips = getTripsForNotification(trips, groups, userId);

    const allReminders = [
      ...eligible.flatMap((item) => buildRemindersForItem(item, now)),
      ...overdueEligible.flatMap((item) => buildOverdueRemindersForItem(item, now)),
      ...eligibleTrips.flatMap((trip) => buildRemindersForTrip(trip, now)),
    ]
      .sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime())
      .slice(0, MAX_SCHEDULED_NOTIFICATIONS);

    await processOverdueTaskNotifications(items, userId);

    const syncKey = buildReminderSyncKey(allReminders);

    if (syncKey === lastReminderSyncKey) {
      return;
    }
    lastReminderSyncKey = syncKey;

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const reminder of allReminders) {
      await scheduleReminder(reminder);
    }
  } catch {
    // Local scheduling may be limited in Expo Go.
  }
}

/** @deprecated use syncScheduleNotifications */
export async function syncItemNotifications(
  items: Item[],
  userId: string
): Promise<void> {
  await syncScheduleNotifications(items, [], [], userId);
}

export async function getScheduledReminderCount(): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}
