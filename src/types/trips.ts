import { TripLocation } from './places';

export interface TripDayStay {
  title: string;
  location?: TripLocation;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

export interface TripItineraryEntry {
  id: string;
  title: string;
  /** Single tag per plan item */
  tag: string;
  startTime?: string;
  endTime?: string;
  location?: TripLocation;
  notes?: string;
}

export interface TripDayPlan {
  date: string;
  /** City or area for this day (multi-city trips) */
  city?: TripLocation;
  /** Lodging for this night */
  stay?: TripDayStay;
  entries: TripItineraryEntry[];
}

export interface Trip {
  id: string;
  groupId: string;
  destination: string;
  destinationDetail?: string;
  placeId?: string;
  destinationSource?: TripLocation['source'];
  startDate: string;
  endDate: string;
  days: TripDayPlan[];
  /** Group members who can see this trip. Empty = all group members (legacy). */
  memberIds: string[];
  /** Linked Splitwise-style expense group (at most one per trip). */
  expenseGroupId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripInput {
  groupId: string;
  destination: string;
  destinationDetail?: string;
  placeId?: string;
  destinationSource?: TripLocation['source'];
  startDate: string;
  endDate: string;
  memberIds: string[];
}

export const TRIP_ENTRY_TAG_SUGGESTIONS = [
  'activity',
  'food',
  'transport',
  'sightseeing',
  'note',
] as const;

export const DEFAULT_TRIP_ENTRY_TAG = 'plan';
