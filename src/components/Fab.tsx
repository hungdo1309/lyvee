import React from 'react';
import { TouchableOpacity, StyleSheet, TouchableOpacityProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, layout, radius, shadows, spacing } from '../constants/theme';

interface FabProps extends TouchableOpacityProps {
  accessibilityLabel: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Use inside a positioned parent instead of fixed bottom-right placement. */
  embedded?: boolean;
}

export function Fab({
  accessibilityLabel,
  style,
  icon = 'add',
  embedded = false,
  ...props
}: FabProps) {
  return (
    <TouchableOpacity
      style={[styles.fab, embedded && styles.fabEmbedded, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
      {...props}
    >
      <Ionicons name={icon} size={30} color={colors.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
    zIndex: 10,
  },
  fabEmbedded: {
    position: 'relative',
    right: undefined,
    bottom: undefined,
    zIndex: 0,
  },
});
