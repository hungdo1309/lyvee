import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useActivityNotifications } from '../../src/hooks/useActivityNotifications';
import { useNotificationPress } from '../../src/hooks/useNotificationPress';
import { ActivityNotificationList } from '../../src/components/ActivityNotificationList';
import { ScreenBackButton } from '../../src/components/ScreenBackButton';
import { colors, layout, spacing } from '../../src/constants/theme';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { notifications, loading } = useActivityNotifications();
  const handlePressNotification = useNotificationPress(user?.id);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          <ScreenBackButton
            label="Back to Home"
            showChevron
            onPress={() => router.replace('/(app)/(tabs)/home' as Href)}
            style={styles.backButton}
          />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          Notifications
        </Text>
        <View style={styles.side} />
      </View>

      <ActivityNotificationList
        notifications={notifications}
        loading={loading}
        onPressNotification={handlePressNotification}
        showRetentionNote={notifications.length > 0}
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
});
