import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';
import { getPasswordStrength, type PasswordStrength } from '../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const STRENGTH_CONFIG: Record<
  PasswordStrength,
  { label: string; color: string; fill: number }
> = {
  weak: { label: 'Weak', color: colors.error, fill: 1 / 3 },
  medium: { label: 'Medium', color: colors.warning, fill: 2 / 3 },
  strong: { label: 'Strong', color: colors.success, fill: 1 },
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  const { label, color, fill } = STRENGTH_CONFIG[strength];

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  track: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
});
