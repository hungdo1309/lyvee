import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useActivityNotifications } from '../../src/hooks/useActivityNotifications';
import { useNotificationPress } from '../../src/hooks/useNotificationPress';
import { ActivityNotificationList } from '../../src/components/ActivityNotificationList';
import { ScreenBackButton } from '../../src/components/ScreenBackButton';
import { HeaderCancelButton } from '../../src/components/HeaderCancelButton';
import { markActivityNotificationsRead } from '../../src/services/activityNotifications';
import { ActivityNotification } from '../../src/types/activityNotifications';
import { appAlert } from '../../src/utils/dialog';
import { colors, layout, spacing } from '../../src/constants/theme';

interface ActionLinkProps {
  label: string;
  onPress: () => void;
  accent?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

function ActionLink({
  label,
  onPress,
  accent = false,
  loading = false,
  disabled = false,
}: ActionLinkProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.actionLink}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <Text style={[styles.actionLabel, accent && styles.actionLabelAccent]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { notifications, loading, hasMore, loadingMore, loadMore } =
    useActivityNotifications();
  const handlePressNotification = useNotificationPress(user?.id);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [markingRead, setMarkingRead] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = notifications.length > 0 && selectedCount === notifications.length;

  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const allNotificationIds = useMemo(
    () => notifications.map((notification) => notification.id),
    [notifications]
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((notificationId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(notifications.map((notification) => notification.id)));
  }, [allSelected, notifications]);

  const markNotificationsRead = useCallback(
    async (notificationIds: string[]) => {
      if (!user?.id || notificationIds.length === 0 || markingRead) return;

      setMarkingRead(true);
      try {
        await markActivityNotificationsRead(user.id, notificationIds);
        exitSelectionMode();
      } catch (error) {
        console.warn('[NotificationsScreen] markActivityNotificationsRead:', error);
        appAlert('Error', 'Could not mark notifications as read.');
      } finally {
        setMarkingRead(false);
      }
    },
    [exitSelectionMode, markingRead, user?.id]
  );

  const handleMarkAllRead = useCallback(() => {
    void markNotificationsRead(allNotificationIds);
  }, [allNotificationIds, markNotificationsRead]);

  const handleMarkSelectedRead = useCallback(() => {
    void markNotificationsRead(selectedIdsArray);
  }, [markNotificationsRead, selectedIdsArray]);

  const handleRowPress = useCallback(
    (notification: ActivityNotification) => {
      if (selectionMode) {
        toggleSelected(notification.id);
        return;
      }
      void handlePressNotification(notification);
    },
    [handlePressNotification, selectionMode, toggleSelected]
  );

  const showActionBar = !loading && notifications.length > 0;

  const listFooter = useMemo(() => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadMoreWrap}>
        <TouchableOpacity
          onPress={() => void loadMore()}
          disabled={loadingMore}
          style={styles.loadMoreButton}
          accessibilityRole="button"
          accessibilityLabel="Load older notifications"
        >
          {loadingMore ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.loadMoreLabel}>Load older</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [hasMore, loadMore, loadingMore]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          {selectionMode ? (
            <HeaderCancelButton onPress={exitSelectionMode} />
          ) : (
            <ScreenBackButton
              label="Back to Home"
              showChevron
              onPress={() => router.replace('/(app)/(tabs)/home' as Href)}
              style={styles.backButton}
            />
          )}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {selectionMode && selectedCount > 0 ? `${selectedCount} selected` : 'Notifications'}
        </Text>
        <View style={styles.side} />
      </View>

      {showActionBar ? (
        <View style={styles.actionBar}>
          {selectionMode ? (
            <>
              <ActionLink
                label={allSelected ? 'Deselect all' : 'Select all'}
                onPress={handleSelectAll}
                accent
                disabled={markingRead}
              />
              <ActionLink
                label="Mark read"
                onPress={handleMarkSelectedRead}
                accent
                loading={markingRead}
                disabled={markingRead}
              />
            </>
          ) : (
            <>
              <ActionLink label="Select" onPress={() => setSelectionMode(true)} accent />
              <ActionLink
                label="Mark all read"
                onPress={handleMarkAllRead}
                accent
                loading={markingRead}
                disabled={markingRead}
              />
            </>
          )}
        </View>
      ) : null}

      <ActivityNotificationList
        notifications={notifications}
        loading={loading}
        onPressNotification={handleRowPress}
        showRetentionNote={notifications.length > 0}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        listFooter={listFooter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: layout.screenPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  side: {
    width: 112,
    zIndex: 1,
  },
  backButton: {
    marginBottom: 0,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  actionLink: {
    minHeight: 28,
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  actionLabelAccent: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadMoreWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadMoreButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  loadMoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
