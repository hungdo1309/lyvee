import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

interface KeyboardAvoidingScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}

/** Wraps screens that use FlatList or mixed layouts instead of a single ScrollView. */
export function KeyboardAvoidingScreen({
  children,
  style,
  keyboardVerticalOffset,
}: KeyboardAvoidingScreenProps) {
  const headerHeight = useHeaderHeight();
  const offset =
    keyboardVerticalOffset ?? (Platform.OS === 'ios' ? headerHeight : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
