import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ItemType } from '../types';
import { itemTypeConfig } from './theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const ONBOARDING_SETUP_STEPS = 2;
export const ONBOARDING_TOUR_STEPS = 4;
export const ONBOARDING_TOTAL_STEPS = ONBOARDING_SETUP_STEPS + ONBOARDING_TOUR_STEPS;

export const ONBOARDING_WELCOME_STEPS = [
  'Set up your group',
  'Invite your household',
  'Learn how Lyvee works',
] as const;

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
        ? 'Plan events, appointments, and outings on a shared calendar.'
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

export const ONBOARDING_CALENDAR_FEATURES: OnboardingFeatureItem[] = [
  {
    icon: 'calendar-outline',
    title: 'Calendar tab',
    description:
      'See everything by month. Swipe between months and tap items to view or edit.',
  },
  {
    icon: 'list-outline',
    title: 'Items tab',
    description:
      'Browse active and expired items by type. Filter with tags or show expired entries.',
  },
  {
    icon: 'people-outline',
    title: 'Switch groups',
    description:
      'Use the group selector at the top to move between households you belong to.',
  },
];

export const ONBOARDING_SHARING_FEATURES: OnboardingFeatureItem[] = [
  {
    icon: 'person-add-outline',
    title: 'Assign members',
    description:
      'Assign tasks and events to specific people so everyone knows who is responsible.',
  },
  {
    icon: 'eye-outline',
    title: 'Control visibility',
    description:
      'Share with everyone, keep it private, or pick exactly who can see an item.',
  },
  {
    icon: 'pricetag-outline',
    title: 'Organize with tags',
    description:
      'Add tags like “kids”, “bills”, or “travel” to filter quickly on Calendar and Items.',
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
      'Expiration dates for documents start with a 30-day reminder so nothing slips through.',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'On their devices',
    description:
      'Assigned members get reminders on their phones when notifications are enabled.',
  },
];

export function onboardingStepLabel(step: number): string {
  return `Step ${step} of ${ONBOARDING_TOTAL_STEPS}`;
}
