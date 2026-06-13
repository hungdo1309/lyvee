import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppMenuHeader } from './AppMenuHeader';
import { colors, layout } from '../constants/theme';

interface MainTabScreenProps {
  title: string;
  children: React.ReactNode;
}

export function MainTabScreen({ title, children }: MainTabScreenProps) {
  return (
    <View style={styles.container}>
      <AppMenuHeader title={title} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingTop: layout.tabContentTopPadding,
  },
});
