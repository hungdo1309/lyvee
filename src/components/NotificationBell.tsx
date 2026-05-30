import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useActivityNotifications } from '../hooks/useActivityNotifications';
import { useNotificationPress } from '../hooks/useNotificationPress';
import { ActivityNotificationList } from './ActivityNotificationList';
import { NotificationsEmptyState } from './NotificationsEmptyState';
import { colors, layout, radius, shadows, spacing } from '../constants/theme';

const POPOVER_WIDTH = 320;
const POPOVER_GAP = 10;
const POPOVER_MIN_HEIGHT = 420;

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NotificationBellProps {
  embedded?: boolean;
}

export function NotificationBell({ embedded = false }: NotificationBellProps) {
  const { user } = useAuth();
  const { popoverNotifications, unreadCount, loading } = useActivityNotifications();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const bellWrapRef = useRef<View>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
    setAnchor(null);
  }, []);

  const handlePressNotification = useNotificationPress(user?.id, handleClose);

  const handleViewAll = useCallback(() => {
    handleClose();
    router.push('/(app)/notifications' as Href);
  }, [handleClose]);

  const viewAllFooter = (
    <TouchableOpacity
      style={styles.viewAllButton}
      onPress={handleViewAll}
      accessibilityRole="button"
      accessibilityLabel="View all notifications"
    >
      <Text style={styles.viewAllLabel}>View all notifications</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </TouchableOpacity>
  );

  if (!user) return null;

  const showUnreadDot = unreadCount > 0;
  const windowSize = Dimensions.get('window');
  const popoverWidth = Math.min(POPOVER_WIDTH, windowSize.width - layout.screenPadding * 2);
  const popoverLeft = anchor
    ? Math.max(
        layout.screenPadding,
        Math.min(
          anchor.x + anchor.width - popoverWidth,
          windowSize.width - layout.screenPadding - popoverWidth
        )
      )
    : layout.screenPadding;
  const popoverBottom = anchor ? windowSize.height - anchor.y + POPOVER_GAP : spacing.lg;
  const popoverMaxHeight = anchor
    ? Math.min(
        POPOVER_MIN_HEIGHT,
        Math.max(220, anchor.y - layout.tabContentTopPadding - spacing.lg)
      )
    : POPOVER_MIN_HEIGHT;
  const caretRight = anchor ? Math.max(12, anchor.width / 2 - 7) : 18;

  return (
    <>
      <View ref={bellWrapRef} style={styles.bellWrap} collapsable={false}>
        <TouchableOpacity
          style={[styles.bellButton, embedded && styles.bellButtonEmbedded]}
          onPress={() => {
            if (open) {
              handleClose();
              return;
            }

            bellWrapRef.current?.measureInWindow((x, y, width, height) => {
              setAnchor({ x, y, width, height });
              setOpen(true);
            });
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
        >
          <Ionicons name="notifications-outline" size={36} color={colors.text} />
        </TouchableOpacity>
        {showUnreadDot ? <View style={styles.unreadDot} /> : null}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          {anchor ? (
            <View
              style={[
                styles.popover,
                {
                  left: popoverLeft,
                  bottom: popoverBottom,
                  width: popoverWidth,
                  maxHeight: popoverMaxHeight,
                },
              ]}
            >
              <View style={[styles.popoverCaret, { right: caretRight }]} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Notifications</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <>
                  {popoverNotifications.length === 0 ? (
                    <NotificationsEmptyState embedded />
                  ) : (
                    <ActivityNotificationList
                      notifications={popoverNotifications}
                      onPressNotification={handlePressNotification}
                      emptySubtitle="Group activity and item updates will show up here."
                      embedded
                    />
                  )}
                  {viewAllFooter}
                </>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellWrap: {
    width: 56,
    height: 56,
    position: 'relative',
    overflow: 'visible',
  },
  bellButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  bellButtonEmbedded: {
    ...shadows.fab,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 2,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  popover: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'visible',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1528',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  popoverCaret: {
    position: 'absolute',
    bottom: -7,
    width: 14,
    height: 14,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    transform: [{ rotate: '45deg' }],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  loaderWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  viewAllLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
