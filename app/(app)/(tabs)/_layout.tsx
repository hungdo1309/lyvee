import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { withLayoutContext } from 'expo-router';
import { Drawer } from 'react-native-drawer-layout';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { useApp } from '../../../src/context/AppContext';
import { AppDrawerProvider } from '../../../src/context/AppDrawerContext';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { AppDrawerContent } from '../../../src/components/AppDrawerContent';
import { colors } from '../../../src/constants/theme';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabsLayout() {
  const { ready } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerContext = useMemo(
    () => ({
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
    }),
    []
  );

  if (!ready) return <LoadingScreen />;

  return (
    <AppDrawerProvider value={drawerContext}>
      <Drawer
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        drawerPosition="left"
        drawerType="front"
        swipeEnabled
        swipeEdgeWidth={48}
        drawerStyle={styles.drawer}
        overlayStyle={styles.overlay}
        renderDrawerContent={() => <AppDrawerContent />}
      >
        <MaterialTopTabs
          initialRouteName="home"
          tabBar={() => null}
          screenOptions={{
            swipeEnabled: true,
            lazy: true,
            sceneStyle: styles.scene,
          }}
        >
          <MaterialTopTabs.Screen name="home" />
          <MaterialTopTabs.Screen name="index" />
          <MaterialTopTabs.Screen name="trips" />
          <MaterialTopTabs.Screen name="expenses" />
          <MaterialTopTabs.Screen name="groups" />
          <MaterialTopTabs.Screen name="settings" />
          <MaterialTopTabs.Screen name="other-apps" />
        </MaterialTopTabs>
      </Drawer>
    </AppDrawerProvider>
  );
}

const styles = StyleSheet.create({
  drawer: {
    width: 280,
    backgroundColor: colors.surface,
  },
  overlay: {
    backgroundColor: colors.overlay,
  },
  scene: {
    backgroundColor: colors.background,
  },
});
