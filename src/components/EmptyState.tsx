import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, radius, spacing, typography } from '../constants/theme';
import { formatButtonLabel } from '../utils/strings';

interface EmptyStateProps {
  icon?: string;
  iconNode?: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  compact?: boolean;
  compactTight?: boolean;
  iconWrapSize?: number;
  iconSize?: number;
}

export function EmptyState({
  icon = '📋',
  iconNode,
  title,
  subtitle,
  action,
  compact = false,
  compactTight = false,
  iconWrapSize = 64,
  iconSize = 28,
}: EmptyStateProps) {
  return (
    <View
      style={[
        styles.container,
        compact && !compactTight && styles.compact,
        compactTight && styles.compactTight,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { width: iconWrapSize, height: iconWrapSize },
        ]}
      >
        {iconNode ?? (
          <Text
            style={[
              styles.icon,
              {
                fontSize: iconSize,
                lineHeight: Math.round(iconSize * 1.25),
              },
            ]}
            allowFontScaling={false}
          >
            {icon}
          </Text>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Text style={styles.action} onPress={action.onPress}>
          {formatButtonLabel(action.label)}
        </Text>
      ) : null}
    </View>
  );
}

/** Inline empty hint for lists and calendar day sections */
export function EmptyHint({ message }: { message: string }) {
  return (
    <Card variant="flat" padded style={styles.hintCard}>
      <Text style={styles.hintText}>{message}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  compact: {
    flex: 0,
    paddingVertical: spacing.lg,
  },
  compactTight: {
    flex: 0,
    paddingTop: spacing.lg,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  iconWrap: {
    borderRadius: radius.full,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  hintCard: {
    marginBottom: 0,
    backgroundColor: colors.iconBg,
  },
  hintText: {
    ...typography.caption,
    textAlign: 'center',
  },
});
