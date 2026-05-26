import { Platform } from 'react-native';
import { layout, spacing } from './theme';

/** Shared horizontal gutter for item create/edit screens. */
export const itemFormLayout = {
  horizontalPadding: layout.screenPadding,
  verticalPadding: layout.screenPadding,
  bottomPadding: spacing.xxl,
  topBarHeight: 44,
  androidTopBarHeight: 56,
};

export function getFormTopBarHeight(): number {
  return Platform.OS === 'android'
    ? itemFormLayout.androidTopBarHeight
    : itemFormLayout.topBarHeight;
}

export function getItemFormTopBarHeight(insets: { top: number }): number {
  return insets.top + getFormTopBarHeight();
}

export function getItemFormContentPadding(insets: { bottom: number }) {
  return {
    paddingBottom: itemFormLayout.bottomPadding + insets.bottom,
  };
}

/** ScrollView props that only apply on iOS — safe to omit on Android. */
export function getIosScrollInsetProps() {
  if (Platform.OS !== 'ios') {
    return {};
  }

  return {
    contentInsetAdjustmentBehavior: 'never' as const,
    automaticallyAdjustsScrollIndicatorInsets: false,
  };
}
