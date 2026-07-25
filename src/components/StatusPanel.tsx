import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

export type StatusPanelTone = 'primary' | 'success' | 'warning' | 'error' | 'money' | 'neutral';

const TONE: Record<
  StatusPanelTone,
  { fill: string; border: string; title: string }
> = {
  primary: {
    fill: colors.primaryMuted,
    border: colors.primary,
    title: colors.primaryDark,
  },
  success: {
    fill: colors.successMuted,
    border: colors.success,
    title: colors.success,
  },
  warning: {
    fill: colors.warningMuted,
    border: colors.warning,
    title: colors.warning,
  },
  error: {
    fill: colors.errorMuted,
    border: colors.error,
    title: colors.error,
  },
  money: {
    fill: colors.moneyMuted,
    border: colors.money,
    title: colors.money,
  },
  neutral: {
    fill: colors.surfaceElevated,
    border: colors.borderStrong,
    title: colors.text,
  },
};

interface StatusPanelProps {
  tone?: StatusPanelTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Bordered muted-fill panel (Invest verdict/empty style) using LyVee colors. */
export function StatusPanel({
  tone = 'primary',
  title,
  children,
  action,
  style,
}: StatusPanelProps) {
  const t = TONE[tone];

  return (
    <View style={[styles.panel, { backgroundColor: t.fill, borderColor: t.border }, style]}>
      {title ? <Text style={[styles.title, { color: t.title }]}>{title}</Text> : null}
      {typeof children === 'string' ? (
        <Text style={styles.body}>{children}</Text>
      ) : (
        children
      )}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  action: {
    marginTop: spacing.mdTight,
  },
});
