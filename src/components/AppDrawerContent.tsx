import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, type Href, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppDrawer } from '../context/AppDrawerContext';
import { GROUPS_ICON_SIZES, GroupsIcon } from './GroupsIcon';
import { ExpensesIcon } from './ExpensesIcon';
import { APP_NAME } from '../constants/app';
import { colors, radius, spacing, typography } from '../constants/theme';

type DrawerRouteName = 'home' | 'index' | 'trips' | 'expenses' | 'groups' | 'settings';

interface DrawerNavItem {
  routeName: DrawerRouteName;
  label: string;
  href: Href;
}

const NAV_ITEMS: DrawerNavItem[] = [
  { routeName: 'home', label: 'Home', href: '/(app)/(tabs)/home' as Href },
  { routeName: 'index', label: 'Calendar', href: '/(app)/(tabs)' as Href },
  { routeName: 'trips', label: 'Trips', href: '/(app)/(tabs)/trips' as Href },
  { routeName: 'expenses', label: 'Expenses', href: '/(app)/(tabs)/expenses' as Href },
  { routeName: 'groups', label: 'Groups', href: '/(app)/(tabs)/groups' as Href },
  { routeName: 'settings', label: 'Settings', href: '/(app)/(tabs)/settings' as Href },
];

const emojiIconStyle = { fontSize: 18 };

function useActiveDrawerRoute(): DrawerRouteName {
  const pathname = usePathname();

  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/groups')) return 'groups';
  if (pathname.includes('/expenses') || pathname.includes('/expense/')) return 'expenses';
  if (pathname.includes('/trips')) return 'trips';
  if (pathname.includes('/home')) return 'home';
  return 'index';
}

function DrawerNavIcon({
  item,
  isActive,
}: {
  item: DrawerNavItem;
  isActive: boolean;
}) {
  if (item.routeName === 'groups') {
    return (
      <GroupsIcon
        size={GROUPS_ICON_SIZES.tab}
        color={colors.primaryDark}
      />
    );
  }

  if (item.routeName === 'expenses') {
    return <ExpensesIcon size={18} />;
  }

  const emoji =
    item.routeName === 'home'
      ? '🏠'
      : item.routeName === 'index'
        ? '📅'
        : item.routeName === 'trips'
          ? '✈️'
          : '⚙️';

  return <Text style={[emojiIconStyle, { opacity: isActive ? 1 : 0.65 }]}>{emoji}</Text>;
}

export function AppDrawerContent() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { closeDrawer } = useAppDrawer();
  const activeRouteName = useActiveDrawerRoute();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, spacing.md) },
      ]}
      scrollEnabled={false}
      style={styles.scroll}
    >
      <View style={styles.brandBlock}>
        <Text style={styles.appName}>{APP_NAME}</Text>
        {user?.name ? <Text style={styles.userName}>{user.name}</Text> : null}
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeRouteName === item.routeName;

          return (
            <TouchableOpacity
              key={item.routeName}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                router.push(item.href);
                closeDrawer();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <View style={styles.navIcon}>
                <DrawerNavIcon item={item} isActive={isActive} />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  brandBlock: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  appName: {
    ...typography.heading,
    fontSize: 24,
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  userName: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  navList: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  navIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
