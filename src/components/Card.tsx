import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, layout, radius, shadows, spacing } from '../constants/theme';

export type CardVariant = 'default' | 'active' | 'selected' | 'flat';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  style,
  padded = true,
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

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.72}>
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
