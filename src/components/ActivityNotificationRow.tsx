import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ActivityNotification } from '../types/activityNotifications';
import { colors, radius, spacing } from '../constants/theme';

function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

interface ActivityNotificationRowProps {
  notification: ActivityNotification;
  onPress: (notification: ActivityNotification) => void;
  fullPage?: boolean;
}

export function ActivityNotificationRow({
  notification,
  onPress,
  fullPage = false,
}: ActivityNotificationRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.notificationRow,
        fullPage && styles.notificationRowFullPage,
        !notification.readAt && styles.notificationRowUnread,
      ]}
      onPress={() => {
        void onPress(notification);
      }}
      activeOpacity={0.85}
    >
      <View style={styles.notificationCopy}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.notificationTime}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
      {!notification.readAt ? <View style={styles.rowUnreadDot} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  notificationRowFullPage: {
    backgroundColor: colors.surface,
  },
  notificationRowUnread: {
    backgroundColor: colors.primaryLight,
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  notificationBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    marginTop: 6,
  },
});
