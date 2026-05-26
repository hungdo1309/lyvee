import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/theme';

export const GROUPS_ICON_SIZES = {
  tab: 20,
  empty: 32,
  emptyLarge: 40,
} as const;

export const GROUPS_EMPTY_ICON_WRAP_SIZE = 80;

interface GroupsIconProps {
  size?: number;
  color?: string;
}

export function GroupsIcon({
  size = GROUPS_ICON_SIZES.empty,
  color = colors.textSecondary,
}: GroupsIconProps) {
  return <Ionicons name="people" size={size} color={color} />;
}
