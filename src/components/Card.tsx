import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';
import { colors, layout, radius, shadows, spacing } from '../constants/theme';

export type CardVariant = 'default' | 'active' | 'selected' | 'flat';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  accessibilityRole?: TouchableOpacityProps['accessibilityRole'];
  accessibilityState?: TouchableOpacityProps['accessibilityState'];
  accessibilityLabel?: string;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  onLongPress,
  delayLongPress,
  style,
  padded = true,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
}: CardProps) {
  const content = (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        variant === 'active' && styles.active,
        variant === 'selected' && styles.selected,
        variant === 'flat' && styles.flat,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        activeOpacity={0.72}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: layout.listGap,
    ...shadows.card,
  },
  padded: {
    padding: spacing.md,
  },
  active: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
    backgroundColor: colors.surface,
  },
});
