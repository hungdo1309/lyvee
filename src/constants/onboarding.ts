import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Group, ItemType } from '../types';
import { APP_NAME } from './app';
import { itemTypeConfig } from './theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const ONBOARDING_SETUP_STEPS = 2;
export const ONBOARDING_TOUR_STEPS = 4;
export const ONBOARDING_TOTAL_STEPS = ONBOARDING_SETUP_STEPS + ONBOARDING_TOUR_STEPS;

export const ONBOARDING_SKIP_TUTORIAL_LABEL = 'Skip Tutorial';
export const ONBOARDING_TOUR_EXIT_LABEL = 'I will figure it out myself';
export const ONBOARDING_FINISH_LABEL = `Start using ${APP_NAME}`;

export const ONBOARDING_WELCOME_TAGLINE = 'Shared life, simplified';

export const ONBOARDING_WELCOME_SUBTITLE = `Organize tasks, activities, and documents with the people who matter — all in ${APP_NAME}.`;

export const ONBOARDING_WELCOME_STEPS = [
  'Create or Join a Group',
  'Invite your household when you create a group',
  `Tour ${APP_NAME}'s main tabs`,
] as const;

export const ONBOARDING_GROUP_SUBTITLE = `Create a group for your household, join with an invite code, or skip for now and set one up later from the Groups tab.`;

export const ONBOARDING_GROUP_EMPTY_PROMPT = 'Create or Join a Group first';

export const ONBOARDING_GROUP_EMPTY_SUBTITLE =
  'Choose whether to join with an invite code or create a new group.';

export function onboardingInviteSubtitle(groupName: string): string {
  return `Optional — share your invite code so others can join "${groupName}" on ${APP_NAME}.`;
}

export interface OnboardingFeatureItem {
  icon: IoniconName;
  title: string;
  description: string;
}

export interface OnboardingItemTypeIntro {
  type: ItemType;
  description: string;
  examples: string;
}

export const ONBOARDING_ITEM_TYPES: OnboardingItemTypeIntro[] = (
  ['task', 'activity', 'document'] as ItemType[]
).map((type) => ({
  type,
  description:
    type === 'task'
      ? 'Track chores, errands, and to-dos. Mark them complete and set recurring reminders.'
      : type === 'activity'
        ? 'Plan events, activities, and outings on your shared calendar.'
        : 'Store expiration dates for passports, insurance, warranties, and more.',
  examples:
    type === 'task'
      ? 'Pay rent, vet appointment, renew subscription'
      : type === 'activity'
        ? 'Soccer practice, dinner party, school pickup'
        : 'Passport renewal, car registration, lease end date',
}));

export function getOnboardingItemTypeLabel(type: ItemType): string {
  return itemTypeConfig[type].label;
}

export function getOnboardingItemTypeColor(type: ItemType): string {
  return itemTypeConfig[type].color;
}

export const ONBOARDING_ITEM_TYPES_SUBTITLE = `${APP_NAME} uses three item types — tasks, activities, and documents — to keep your household organized.`;

export const ONBOARDING_NAV_TITLE = 'Your four tabs';

export const ONBOARDING_NAV_SUBTITLE = `Home, Calendar, Groups, and Settings — here is how to get around ${APP_NAME}.`;

export const ONBOARDING_SHARING_SUBTITLE = `Assign items, control who can see them, and use tags to stay organized in ${APP_NAME}.`;

export const ONBOARDING_REMINDERS_SUBTITLE = `Turn on reminders so ${APP_NAME} can nudge you before due dates and expirations.`;

export const ONBOARDING_NAV_FEATURES: OnboardingFeatureItem[] = [
  {
    icon: 'home-outline',
    title: 'Home tab',
    description:
      'See the next two weeks at a glance. Filter by type or tags, expand a day, and tap + to add an item.',
  },
  {
    icon: 'calendar-outline',
    title: 'Calendar tab',
    description:
      'Browse by month, tap a day to see what is scheduled, filter the view, and add items to that date.',
  },
  {
    icon: 'people-outline',
    title: 'Groups tab',
    description:
      'Manage members, roles, and invite codes. Open a group and tap View all items for active, completed, and expired entries.',
  },
  {
    icon: 'settings-outline',
    title: 'Settings tab',
    description:
      'View your profile, change email or password, send feedback, and sign out when you need to.',
  },
];

export const ONBOARDING_SHARING_FEATURES: OnboardingFeatureItem[] = [
  {
    icon: 'person-add-outline',
    title: 'Assign members',
    description:
      'Assign tasks and activities to specific people so everyone knows who is responsible.',
  },
  {
    icon: 'eye-outline',
    title: 'Control visibility',
    description:
      'Share with the whole group, keep an item private to you and assignees, or pick exactly who can see it.',
  },
  {
    icon: 'pricetag-outline',
    title: 'Organize with tags',
    description:
      'Add tags like “kids”, “bills”, or “travel”, then filter Home and Calendar to find things fast.',
  },
];

export const ONBOARDING_REMINDER_FEATURES: OnboardingFeatureItem[] = [
  {
    icon: 'notifications-outline',
    title: 'Per-item reminders',
    description:
      'When you add a date, choose when to be reminded — from 1 hour to 30 days before.',
  },
  {
    icon: 'document-text-outline',
    title: 'Documents default to 30 days',
    description:
      'New documents start with a 30-day reminder before their expiration date.',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Local and push alerts',
    description:
      'Assigned members receive reminders on their phones when notifications are enabled.',
  },
];

export function onboardingStepLabel(step: number, totalSteps: number = ONBOARDING_TOTAL_STEPS): string {
  return `Step ${step} of ${totalSteps}`;
}

export function normalizeOnboardingParam(
  value?: string | string[]
): string | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized || undefined;
}

export function normalizeOnboardingGroupId(
  groupId?: string | string[]
): string | undefined {
  return normalizeOnboardingParam(groupId);
}

export function buildOnboardingHref(pathname: string, groupId?: string): Href {
  if (!groupId) return pathname as Href;
  return `${pathname}?groupId=${encodeURIComponent(groupId)}` as Href;
}

export function buildOnboardingInviteHref(
  group: Pick<Group, 'id' | 'name' | 'inviteCode'>
): Href {
  return {
    pathname: '/(app)/onboarding/invite',
    params: {
      groupId: group.id,
      groupName: group.name,
      inviteCode: group.inviteCode,
    },
  } as Href;
}

export function getOnboardingSetupStepProps(
  setupStep: 1 | 2
): { step: number; totalSteps: number } {
  return { step: setupStep, totalSteps: ONBOARDING_SETUP_STEPS };
}

export function getOnboardingTourStepProps(
  tourStep: 1 | 2 | 3 | 4,
  _groupId?: string
): { step: number; totalSteps: number } {
  return { step: tourStep, totalSteps: ONBOARDING_TOUR_STEPS };
}
