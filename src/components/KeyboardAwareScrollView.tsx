import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { spacing } from '../constants/theme';

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
};

export function KeyboardAwareScrollView({
  children,
  style,
  containerStyle,
  contentContainerStyle,
  keyboardVerticalOffset,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const headerHeight = useHeaderHeight();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const offset =
    keyboardVerticalOffset ?? (Platform.OS === 'ios' ? headerHeight : 0);

  const keyboardPadding =
    keyboardHeight > 0 && Platform.OS === 'ios'
      ? { paddingBottom: keyboardHeight + spacing.lg }
      : null;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, containerStyle, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      keyboardVerticalOffset={offset}
    >
      <ScrollView
        {...scrollViewProps}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
          keyboardPadding,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
