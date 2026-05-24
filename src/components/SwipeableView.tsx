import React, { useMemo, useRef } from 'react';
import { PanResponder, View, type StyleProp, type ViewStyle } from 'react-native';

const DEFAULT_SWIPE_DISTANCE = 48;
const SWIPE_VELOCITY = 0.25;

interface SwipeableViewProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
  swipeDistance?: number;
  /** Prefer horizontal swipes over child touchables (e.g. top tab bar). */
  captureHorizontalSwipe?: boolean;
}

export function SwipeableView({
  children,
  onSwipeLeft,
  onSwipeRight,
  style,
  enabled = true,
  swipeDistance = DEFAULT_SWIPE_DISTANCE,
  captureHorizontalSwipe = false,
}: SwipeableViewProps) {
  const handlersRef = useRef({
    onSwipeLeft,
    onSwipeRight,
    enabled,
    swipeDistance,
    captureHorizontalSwipe,
  });
  handlersRef.current = {
    onSwipeLeft,
    onSwipeRight,
    enabled,
    swipeDistance,
    captureHorizontalSwipe,
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!handlersRef.current.enabled) return false;
          const { dx, dy } = gestureState;
          return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (!handlersRef.current.enabled || !handlersRef.current.captureHorizontalSwipe) {
            return false;
          }
          const { dx, dy } = gestureState;
          return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2;
        },
        onPanResponderRelease: (_, gestureState) => {
          const {
            onSwipeLeft,
            onSwipeRight,
            enabled: isEnabled,
            swipeDistance: distance,
          } = handlersRef.current;
          if (!isEnabled) return;

          const { dx, vx } = gestureState;
          if (dx <= -distance || vx <= -SWIPE_VELOCITY) {
            onSwipeLeft?.();
            return;
          }
          if (dx >= distance || vx >= SWIPE_VELOCITY) {
            onSwipeRight?.();
          }
        },
      }),
    []
  );

  return (
    <View style={style} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
