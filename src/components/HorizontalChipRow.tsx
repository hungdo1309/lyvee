import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '../constants/theme';

interface HorizontalChipRowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Horizontal chip scroller that won't stretch inside parent ScrollViews. */
export function HorizontalChipRow({ children, style }: HorizontalChipRowProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 40,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
});
