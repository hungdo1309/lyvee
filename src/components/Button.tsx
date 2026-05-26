import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { colors, layout, radius, spacing } from '../constants/theme';
import { formatButtonLabel } from '../utils/strings';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cancel';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  preserveTitle?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  size = 'md',
  preserveTitle = false,
  disabled,
  style,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const formattedTitle = preserveTitle ? title : formatButtonLabel(title);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
      accessibilityLabel={accessibilityLabel ?? formattedTitle}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'cancel'
              ? colors.onPrimary
              : colors.primary
          }
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`]]}>{formattedTitle}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#FEE2E2',
  },
  cancel: {
    backgroundColor: colors.error,
  },
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  text_primary: {
    color: colors.onPrimary,
  },
  text_secondary: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.error,
  },
  text_cancel: {
    color: colors.onPrimary,
  },
});
