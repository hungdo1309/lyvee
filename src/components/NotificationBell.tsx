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
import { measureTargetInWindow } from './KeyboardAwareScrollView';

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
  variant?: 'fab' | 'header';
}

export function NotificationBell({
  embedded = false,
  variant = embedded ? 'fab' : 'header',
}: NotificationBellProps) {
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

  const isHeader = variant === 'header';
  const iconSize = isHeader ? 22 : 36;
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

  const popoverLayout = (() => {
    if (!anchor) {
      return {
        left: popoverLeft,
        top: spacing.lg,
        width: popoverWidth,
        maxHeight: POPOVER_MIN_HEIGHT,
        caretOnTop: false,
      };
    }

    if (isHeader) {
      const top = anchor.y + anchor.height + POPOVER_GAP;
      return {
        left: popoverLeft,
        top,
        width: popoverWidth,
        maxHeight: Math.min(
          POPOVER_MIN_HEIGHT,
          Math.max(220, windowSize.height - top - spacing.lg)
        ),
        caretOnTop: true,
      };
    }

    const bottom = windowSize.height - anchor.y + POPOVER_GAP;
    return {
      left: popoverLeft,
      bottom,
      width: popoverWidth,
      maxHeight: Math.min(
        POPOVER_MIN_HEIGHT,
        Math.max(220, anchor.y - layout.appHeaderHeight - spacing.lg)
      ),
      caretOnTop: false,
    };
  })();

  if (!user) return null;

  const showUnreadBadge = unreadCount > 0;
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const caretRight = anchor ? Math.max(12, anchor.width / 2 - 7) : 18;

  return (
    <>
      <View
        ref={bellWrapRef}
        style={[styles.bellWrap, isHeader && styles.bellWrapHeader]}
        collapsable={false}
      >
        <TouchableOpacity
          style={[
            styles.bellButton,
            isHeader && styles.bellButtonHeader,
            embedded && styles.bellButtonEmbedded,
          ]}
          onPress={() => {
            if (open) {
              handleClose();
              return;
            }

            if (
              !bellWrapRef.current ||
              !measureTargetInWindow(bellWrapRef.current, (x, y, width, height) => {
                setAnchor({ x, y, width, height });
                setOpen(true);
              })
            ) {
              setAnchor(null);
              setOpen(true);
            }
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
        >
          <Ionicons
            name={showUnreadBadge ? 'notifications' : 'notifications-outline'}
            size={iconSize}
            color={showUnreadBadge ? colors.primary : colors.text}
          />
        </TouchableOpacity>
        {showUnreadBadge ? (
          <View style={[styles.unreadBadge, isHeader && styles.unreadBadgeHeader]}>
            <Text style={[styles.unreadBadgeText, isHeader && styles.unreadBadgeTextHeader]}>
              {unreadLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          {anchor ? (
            <View
              style={[
                styles.popover,
                {
                  left: popoverLayout.left,
                  width: popoverLayout.width,
                  maxHeight: popoverLayout.maxHeight,
                  ...(popoverLayout.top != null
                    ? { top: popoverLayout.top }
                    : { bottom: popoverLayout.bottom }),
                },
              ]}
            >
              <View
                style={[
                  popoverLayout.caretOnTop ? styles.popoverCaretTop : styles.popoverCaret,
                  { right: caretRight },
                ]}
              />
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
  bellWrapHeader: {
    width: 40,
    height: 40,
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
  bellButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  bellButtonEmbedded: {
    ...shadows.fab,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  unreadBadgeHeader: {
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onPrimary,
    lineHeight: 13,
  },
  unreadBadgeTextHeader: {
    fontSize: 9,
    lineHeight: 11,
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
  popoverCaretTop: {
    position: 'absolute',
    top: -7,
    width: 14,
    height: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
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
