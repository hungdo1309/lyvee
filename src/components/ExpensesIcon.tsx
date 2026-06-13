import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/theme';

export const EXPENSES_ICON_SIZE = {
  tab: 18,
  card: 20,
  emptyLarge: 40,
} as const;

export const EXPENSES_EMPTY_ICON_WRAP_SIZE = 80;

interface ExpensesIconProps {
  size?: number;
  color?: string;
  /** Use outline style instead of filled cash icon. */
  variant?: 'filled' | 'outline';
}

export function ExpensesIcon({
  size = EXPENSES_ICON_SIZE.tab,
  color = colors.money,
  variant = 'filled',
}: ExpensesIconProps) {
  return (
    <Ionicons
      name={variant === 'outline' ? 'cash-outline' : 'cash'}
      size={size}
      color={color}
    />
  );
}
