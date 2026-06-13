import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { HeaderCancelButton } from './HeaderCancelButton';
import { colors, spacing } from '../constants/theme';
import {
  getFormTopBarHeight,
  getItemFormContentPadding,
  getItemFormTopBarHeight,
  getIosScrollInsetProps,
  itemFormLayout,
} from '../constants/itemFormLayout';

interface ItemFormScreenProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  /** Enables nested drag-to-reorder lists inside the screen scroll view. */
  nestableScroll?: boolean;
}

export function ItemFormScreen({
  title,
  leftAction,
  rightAction,
  children,
  nestableScroll = false,
}: ItemFormScreenProps) {
  const insets = useSafeAreaInsets();
  const iosScrollProps = getIosScrollInsetProps();
  const contentContainerStyle = [styles.content, getItemFormContentPadding(insets)];

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.frame,
          {
            paddingTop: insets.top,
            paddingHorizontal: itemFormLayout.horizontalPadding,
          },
        ]}
      >
        <View style={[styles.topBar, { height: getFormTopBarHeight() }]}>
          <View style={[styles.side, styles.sideLeft]}>
            {leftAction ?? <HeaderCancelButton />}
          </View>
          {title ? (
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
          ) : null}
          <View style={[styles.side, styles.sideRight]}>{rightAction}</View>
        </View>

        {nestableScroll ? (
          <NestableScrollContainer
            style={styles.flex}
            {...iosScrollProps}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={contentContainerStyle}
          >
            {children}
          </NestableScrollContainer>
        ) : (
          <KeyboardAwareScrollView
            style={styles.flex}
            keyboardVerticalOffset={
              Platform.OS === 'ios' ? getItemFormTopBarHeight(insets) : 0
            }
            {...iosScrollProps}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={contentContainerStyle}
          >
            {children}
          </KeyboardAwareScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  frame: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    marginBottom: itemFormLayout.verticalPadding,
  },
  side: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  sideLeft: {
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1.2,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    width: '100%',
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
  content: {},
});
