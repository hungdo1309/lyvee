import { withLayoutContext } from 'expo-router';
import { Text, StyleSheet, type ColorValue } from 'react-native';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { useApp } from '../../../src/context/AppContext';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { TopTabBar } from '../../../src/components/TopTabBar';
import { GROUPS_ICON_SIZES, GroupsIcon } from '../../../src/components/GroupsIcon';
import { colors, layout, spacing } from '../../../src/constants/theme';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabsLayout() {
  const { ready } = useApp();

  if (!ready) return <LoadingScreen />;

  return (
    <MaterialTopTabs
      initialRouteName="home"
      tabBar={(props) => <TopTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowIcon: true,
        tabBarIndicatorStyle: styles.tabIndicator,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarPressColor: colors.primaryLight,
        swipeEnabled: true,
        lazy: true,
        sceneStyle: styles.scene,
      }}
    >
      <MaterialTopTabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" activeColor={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabIcon icon="📅" activeColor={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => (
            <GroupsIcon size={GROUPS_ICON_SIZES.tab} color={String(color)} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon icon="⚙️" activeColor={color} />,
        }}
      />
    </MaterialTopTabs>
  );
}

function TabIcon({ icon, activeColor }: { icon: string; activeColor: ColorValue }) {
  const isActive = activeColor === colors.primary;
  return (
    <Text style={{ fontSize: 18, opacity: isActive ? 1 : 0.5 }}>
      {icon}
    </Text>
  );
}

const styles = StyleSheet.create({
  scene: {
    paddingTop: layout.tabContentTopPadding,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIndicator: {
    backgroundColor: colors.primary,
    height: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'none',
    marginTop: 2,
  },
  tabItem: {
    flexDirection: 'column',
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
});