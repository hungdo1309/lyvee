export type ItemType = 'task' | 'activity' | 'document';

export type ItemReminderOffset =
  | 'none'
  | 'at_time'
  | '1h'
  | '24h'
  | '3d'
  | '7d'
  | '14d'
  | '30d';

export interface ReminderOption {
  value: ItemReminderOffset;
  label: string;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: 'none', label: 'Off' },
  { value: 'at_time', label: 'At due time' },
  { value: '1h', label: '1 hour before' },
  { value: '24h', label: '1 day before' },
  { value: '3d', label: '3 days before' },
  { value: '7d', label: '1 week before' },
  { value: '14d', label: '2 weeks before' },
  { value: '30d', label: '30 days before' },
];

export function defaultReminderForType(type: ItemType): ItemReminderOffset {
  if (type === 'document') return '30d';
  return '24h';
}

export function getReminderOptionLabel(value: ItemReminderOffset): string {
  return REMINDER_OPTIONS.find((option) => option.value === value)?.label ?? 'Off';
}

export type ItemVisibility = 'everyone' | 'private' | 'custom';

export type RecurringFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export interface RecurringRule {
  frequency: RecurringFrequency;
  interval?: number;
  unit?: 'days' | 'weeks' | 'months' | 'years';
  daysOfWeek?: number[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  pushToken?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  inviteCode: string;
  createdAt: string;
}

export interface GroupInvite {
  groupId: string;
  groupName: string;
  ownerId: string;
  createdAt: string;
}

export interface Item {
  id: string;
  groupId: string;
  title: string;
  type: ItemType;
  dateTime: string | null;
  recurringRule: RecurringRule;
  visibility: ItemVisibility;
  allowedMembers: string[];
  assignedTo: string[];
  notes: string;
  tags: string[];
  /** When to notify assignees (or visible members if unassigned). */
  reminderOffset?: ItemReminderOffset;
  completed: boolean;
  /** Per-occurrence completion keys (yyyy-MM-dd) for recurring tasks */
  completedOccurrences?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ItemInput = Omit<
  Item,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy'
> & {
  id?: string;
};

export const DEFAULT_RECURRING_RULE: RecurringRule = { frequency: 'none' };

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  screenName: string;
  message: string;
  createdAt: string;
}

export const FEEDBACK_SCREENS = [
  'Calendar',
  'Items',
  'Groups',
  'Settings',
  'Create Item',
  'Edit Item',
  'Group Detail',
  'Select Group',
  'Other',
] as const;

export type FeedbackScreen = (typeof FEEDBACK_SCREENS)[number];
