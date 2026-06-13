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
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { spacing } from '../constants/theme';

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  /** When false, the scroll view sizes from its content/maxHeight instead of flexing to fill. */
  fill?: boolean;
};

type ScrollToFocusedInput = (target: MeasurableTarget) => void;

const KeyboardFocusContext = createContext<ScrollToFocusedInput | null>(null);
const ScrollIntoViewContext = createContext<ScrollToFocusedInput | null>(null);

const SCROLL_GAP = spacing.lg * 2;
const DEFAULT_KEYBOARD_HEIGHT = Platform.OS === 'ios' ? 291 : 280;

type MeasureInWindowCallback = (
  x: number,
  y: number,
  width: number,
  height: number
) => void;

type MeasurableTarget = React.Component | null | undefined;

type NativeMeasurable = {
  measureInWindow?: (callback: MeasureInWindowCallback) => void;
};

function tryMeasureInWindow(
  target: NativeMeasurable,
  callback: MeasureInWindowCallback
): boolean {
  if (typeof target.measureInWindow !== 'function') {
    return false;
  }

  try {
    target.measureInWindow(callback);
    return true;
  } catch {
    return false;
  }
}

/** Measure a mounted native view in window coordinates without calling measureLayout. */
export function measureTargetInWindow(
  target: MeasurableTarget,
  callback: MeasureInWindowCallback
): boolean {
  if (!target) return false;

  if (tryMeasureInWindow(target as NativeMeasurable, callback)) {
    return true;
  }

  let node: number | null = null;
  try {
    const handle = findNodeHandle(target as React.Component);
    if (typeof handle === 'number') {
      node = handle;
    }
  } catch {
    return false;
  }

  if (node == null || typeof UIManager.measureInWindow !== 'function') {
    return false;
  }

  try {
    UIManager.measureInWindow(node, callback);
    return true;
  } catch {
    return false;
  }
}

export function useKeyboardFocusScroll(): ScrollToFocusedInput | null {
  return useContext(KeyboardFocusContext);
}

export function useScrollIntoView(): ScrollToFocusedInput | null {
  return useContext(ScrollIntoViewContext);
}

export function scrollFocusedInputIntoView(
  scrollToFocus: ScrollToFocusedInput | null,
  target: MeasurableTarget
) {
  if (!scrollToFocus || !target) return;
  scrollToFocus(target);
  requestAnimationFrame(() => {
    if (target) scrollToFocus(target);
  });
}

export function scrollElementIntoView(
  scrollIntoView: ScrollToFocusedInput | null,
  target: MeasurableTarget
) {
  if (!scrollIntoView || !target) return;
  scrollIntoView(target);
}

export function KeyboardAwareScrollView({
  children,
  style,
  containerStyle,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  fill = true,
  onScroll,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const keyboardScreenYRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<MeasurableTarget>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const getVisibleBounds = useCallback(() => {
    const windowHeight = Dimensions.get('window').height;
    const visibleTop = keyboardVerticalOffset + SCROLL_GAP;
    const keyboardTop =
      keyboardScreenYRef.current ??
      (keyboardHeightRef.current > 0
        ? windowHeight - keyboardHeightRef.current
        : windowHeight - DEFAULT_KEYBOARD_HEIGHT);
    const visibleBottom = keyboardTop - keyboardVerticalOffset - SCROLL_GAP;

    return { visibleTop, visibleBottom };
  }, [keyboardVerticalOffset]);

  const scrollTargetIntoView = useCallback(
    (target: MeasurableTarget) => {
      if (!target || !scrollRef.current) return;

      const measured = measureTargetInWindow(target, (_x, y, _width, height) => {
        const { visibleTop, visibleBottom } = getVisibleBounds();
        const targetBottom = y + height;
        let delta = 0;

        if (y < visibleTop) {
          delta = y - visibleTop;
        } else if (targetBottom > visibleBottom) {
          delta = targetBottom - visibleBottom;
        }

        if (delta === 0) return;

        const nextY = Math.max(0, scrollYRef.current + delta);
        scrollYRef.current = nextY;
        scrollRef.current?.scrollTo({
          y: nextY,
          animated: false,
        });
      });

      if (!measured) return;
    },
    [getVisibleBounds]
  );

  const flushPendingScroll = useCallback(() => {
    if (!pendingTargetRef.current) return;
    scrollTargetIntoView(pendingTargetRef.current);
  }, [scrollTargetIntoView]);

  const scrollElementIntoView = useCallback(
    (target: MeasurableTarget) => {
      scrollTargetIntoView(target);
    },
    [scrollTargetIntoView]
  );

  const scrollToFocusedInput = useCallback<ScrollToFocusedInput>(
    (target) => {
      if (!target) return;

      pendingTargetRef.current = target;
      scrollTargetIntoView(target);
      requestAnimationFrame(() => scrollTargetIntoView(target));
    },
    [scrollTargetIntoView]
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardScreenYRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      flushPendingScroll();
      requestAnimationFrame(flushPendingScroll);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      keyboardScreenYRef.current = null;
      setKeyboardHeight(0);
      pendingTargetRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [flushPendingScroll]);

  const keyboardPadding =
    keyboardHeight > 0 ? { paddingBottom: keyboardHeight + spacing.lg } : null;

  return (
    <KeyboardFocusContext.Provider value={scrollToFocusedInput}>
      <ScrollIntoViewContext.Provider value={scrollElementIntoView}>
        <ScrollView
          ref={scrollRef}
          {...scrollViewProps}
          style={[fill ? styles.flex : null, containerStyle, style]}
          contentContainerStyle={[
            styles.content,
            contentContainerStyle,
            keyboardPadding,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          scrollIndicatorInsets={{ right: spacing.xs }}
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
      </ScrollIntoViewContext.Provider>
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
