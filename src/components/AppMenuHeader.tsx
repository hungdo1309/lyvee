import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDrawer } from '../context/AppDrawerContext';
import { NotificationBell } from './NotificationBell';
import { colors, layout, spacing } from '../constants/theme';

interface AppMenuHeaderProps {
  title: string;
  showNotifications?: boolean;
}

export function AppMenuHeader({
  title,
  showNotifications = true,
}: AppMenuHeaderProps) {
  const { openDrawer } = useAppDrawer();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={openDrawer}
          style={styles.menuButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.trailing}>
          {showNotifications ? <NotificationBell variant="header" /> : <View style={styles.menuButton} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.appHeaderHeight,
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  trailing: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
