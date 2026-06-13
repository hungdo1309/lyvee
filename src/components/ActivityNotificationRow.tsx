import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  selectionMode?: boolean;
  selected?: boolean;
}

export function ActivityNotificationRow({
  notification,
  onPress,
  fullPage = false,
  selectionMode = false,
  selected = false,
}: ActivityNotificationRowProps) {
  const isUnread = !notification.readAt;

  return (
    <TouchableOpacity
      style={[
        styles.notificationRow,
        fullPage && styles.notificationRowFullPage,
        isUnread && styles.notificationRowUnread,
        selectionMode && selected && styles.notificationRowSelected,
      ]}
      onPress={() => {
        onPress(notification);
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: selectionMode ? selected : undefined }}
    >
      {isUnread ? <View style={styles.unreadAccent} /> : null}
      {selectionMode ? (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? (
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
          ) : null}
        </View>
      ) : null}
      <View style={styles.notificationCopy}>
        <View style={styles.titleRow}>
          <Text style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}>
            {notification.title}
          </Text>
          {isUnread && !selectionMode ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>New</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[styles.notificationBody, isUnread && styles.notificationBodyUnread]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
        <Text style={styles.notificationTime}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
      {!selectionMode && isUnread ? <View style={styles.rowUnreadDot} /> : null}
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
    position: 'relative',
    overflow: 'hidden',
  },
  notificationRowFullPage: {
    backgroundColor: colors.surface,
  },
  notificationRowUnread: {
    backgroundColor: '#E8E2FA',
    borderBottomColor: colors.border,
  },
  notificationRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  notificationTitleUnread: {
    fontWeight: '800',
    color: colors.text,
  },
  unreadBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimary,
    letterSpacing: 0.3,
  },
  notificationBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  notificationBodyUnread: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
