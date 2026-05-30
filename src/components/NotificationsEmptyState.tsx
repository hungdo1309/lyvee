import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NOTIFICATION_RETENTION_DAYS } from '../constants/notifications';
import { colors, radius, spacing } from '../constants/theme';

export const NOTIFICATIONS_EMPTY_SUBTITLE = `Group activity and item updates from the last ${NOTIFICATION_RETENTION_DAYS} days will show up here.`;

interface NotificationsEmptyStateProps {
  title?: string;
  subtitle?: string;
  embedded?: boolean;
  fullHeight?: boolean;
}

export function NotificationsEmptyState({
  title = 'No notifications yet',
  subtitle = NOTIFICATIONS_EMPTY_SUBTITLE,
  embedded = false,
  fullHeight = false,
}: NotificationsEmptyStateProps) {
  return (
    <View
      style={[
        styles.emptyWrap,
        embedded && styles.emptyWrapEmbedded,
        fullHeight && styles.emptyWrapFullHeight,
      ]}
    >
      <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyWrapEmbedded: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  emptyWrapFullHeight: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
