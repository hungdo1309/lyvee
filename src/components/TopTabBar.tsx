import React from 'react';
import { StyleSheet } from 'react-native';
import {
  MaterialTopTabBar,
  type MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

export function TopTabBar(props: MaterialTopTabBarProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <MaterialTopTabBar {...props} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
  },
});
