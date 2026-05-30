import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  type NativeMethods,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { spacing } from '../constants/theme';

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
};

type ScrollToFocusedInput = (target: NativeMethods | null | undefined) => void;

const KeyboardFocusContext = createContext<ScrollToFocusedInput | null>(null);

const SCROLL_GAP = spacing.lg * 2;

export function useKeyboardFocusScroll(): ScrollToFocusedInput | null {
  return useContext(KeyboardFocusContext);
}

export function scrollFocusedInputIntoView(
  scrollToFocus: ScrollToFocusedInput | null,
  target: NativeMethods | null | undefined
) {
  if (!scrollToFocus || !target) return;
  scrollToFocus(target);
}

export function KeyboardAwareScrollView({
  children,
  style,
  containerStyle,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  onScroll,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const pendingTargetRef = useRef<NativeMethods | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollTargetIntoView = useCallback(
    (target: NativeMethods | null | undefined) => {
      if (!target || !scrollRef.current) return;

      target.measureInWindow((_x, y, _width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardHeight = keyboardHeightRef.current;
        const visibleBottom =
          Platform.OS === 'android'
            ? windowHeight - keyboardVerticalOffset
            : windowHeight - keyboardHeight - keyboardVerticalOffset;
        const inputBottom = y + height;

        if (inputBottom > visibleBottom - SCROLL_GAP) {
          const delta = inputBottom - visibleBottom + SCROLL_GAP;
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + delta,
            animated: true,
          });
        }
      });
    },
    [keyboardVerticalOffset]
  );

  const flushPendingScroll = useCallback(() => {
    if (!pendingTargetRef.current) return;
    const target = pendingTargetRef.current;
    pendingTargetRef.current = null;
    scrollTargetIntoView(target);
  }, [scrollTargetIntoView]);

  const scrollToFocusedInput = useCallback<ScrollToFocusedInput>(
    (target) => {
      if (!target) return;

      const run = () => {
        if (keyboardHeightRef.current <= 0) {
          pendingTargetRef.current = target;
          return;
        }
        scrollTargetIntoView(target);
      };

      run();
      requestAnimationFrame(run);
      setTimeout(run, Platform.OS === 'ios' ? 100 : 200);
    },
    [scrollTargetIntoView]
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(flushPendingScroll);
      setTimeout(flushPendingScroll, Platform.OS === 'ios' ? 50 : 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      pendingTargetRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [flushPendingScroll]);

  const keyboardPadding =
    keyboardHeight > 0 && Platform.OS === 'ios'
      ? { paddingBottom: keyboardHeight + spacing.lg }
      : null;

  return (
    <KeyboardFocusContext.Provider value={scrollToFocusedInput}>
      <ScrollView
        ref={scrollRef}
        {...scrollViewProps}
        style={[styles.flex, containerStyle, style]}
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
          keyboardPadding,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={false}
        nestedScrollEnabled
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </KeyboardFocusContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.sm,
  },
});
