export type ItemType = 'task' | 'activity' | 'document';

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
