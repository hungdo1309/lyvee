import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { HeaderCancelButton } from './HeaderCancelButton';
import { colors } from '../constants/theme';
import {
  getFormTopBarHeight,
  getItemFormContentPadding,
  getItemFormTopBarHeight,
  getIosScrollInsetProps,
  itemFormLayout,
} from '../constants/itemFormLayout';

interface ItemFormScreenProps {
  title: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function ItemFormScreen({
  title,
  rightAction,
  children,
}: ItemFormScreenProps) {
  const insets = useSafeAreaInsets();
  const iosScrollProps = getIosScrollInsetProps();

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
          <View style={styles.side}>
            <HeaderCancelButton />
          </View>
          <View style={styles.titleWrap} pointerEvents="none">
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={[styles.side, styles.sideRight]}>{rightAction}</View>
        </View>

        <KeyboardAwareScrollView
          style={styles.flex}
          keyboardVerticalOffset={
            Platform.OS === 'ios' ? getItemFormTopBarHeight(insets) : 0
          }
          {...iosScrollProps}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, getItemFormContentPadding(insets)]}
        >
          {children}
        </KeyboardAwareScrollView>
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
    zIndex: 1,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 96,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
