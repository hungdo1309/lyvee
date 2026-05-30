import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ActivityNotification } from '../types/activityNotifications';
import { ActivityNotificationRow } from './ActivityNotificationRow';
import { NotificationsEmptyState, NOTIFICATIONS_EMPTY_SUBTITLE } from './NotificationsEmptyState';
import { NotificationsRetentionNote } from './NotificationsRetentionNote';
import { colors, radius, spacing } from '../constants/theme';

interface ActivityNotificationListProps {
  notifications: ActivityNotification[];
  loading?: boolean;
  onPressNotification: (notification: ActivityNotification) => void;
  listFooter?: React.ReactElement | null;
  emptyTitle?: string;
  emptySubtitle?: string;
  embedded?: boolean;
  showRetentionNote?: boolean;
}

export function ActivityNotificationList({
  notifications,
  loading = false,
  onPressNotification,
  listFooter = null,
  emptyTitle = 'No notifications yet',
  emptySubtitle = NOTIFICATIONS_EMPTY_SUBTITLE,
  embedded = false,
  showRetentionNote = false,
}: ActivityNotificationListProps) {
  if (loading) {
    return (
      <View style={[styles.loaderWrap, !embedded && styles.loaderWrapFullHeight]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <NotificationsEmptyState
        title={emptyTitle}
        subtitle={emptySubtitle}
        embedded={embedded}
        fullHeight={!embedded}
      />
    );
  }

  if (!embedded) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {showRetentionNote ? <NotificationsRetentionNote /> : null}
        {notifications.map((notification) => (
          <ActivityNotificationRow
            key={notification.id}
            notification={notification}
            onPress={onPressNotification}
            fullPage
          />
        ))}
        {listFooter}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      style={[styles.list, styles.listEmbedded]}
      contentContainerStyle={[styles.listContent, styles.listContentEmbedded]}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={listFooter}
      renderItem={({ item }) => (
        <ActivityNotificationRow notification={item} onPress={onPressNotification} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loaderWrapFullHeight: {
    flex: 1,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  list: {
    flexGrow: 0,
  },
  listEmbedded: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  listContentEmbedded: {
    flexGrow: 0,
  },
});
