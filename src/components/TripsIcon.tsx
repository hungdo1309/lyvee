import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/theme';

export const TRIPS_ICON_SIZE = {
  tab: 20,
  empty: 32,
  emptyLarge: 40,
} as const;

export const TRIPS_EMPTY_ICON_WRAP_SIZE = 80;

interface TripsIconProps {
  size?: number;
  color?: string;
}

export function TripsIcon({
  size = TRIPS_ICON_SIZE.empty,
  color = colors.primaryDark,
}: TripsIconProps) {
  return <Ionicons name="airplane" size={size} color={color} />;
}
