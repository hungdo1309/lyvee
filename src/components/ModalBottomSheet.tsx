import React from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { colors, radius, spacing } from '../constants/theme';

const MAX_SHEET_HEIGHT = Dimensions.get('window').height * 0.88;

interface ModalBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  keyboardVerticalOffset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bounces?: boolean;
}

export function ModalBottomSheet({
  visible,
  onClose,
  children,
  keyboardVerticalOffset = 0,
  contentContainerStyle,
  bounces = true,
}: ModalBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const scrollMaxHeight = MAX_SHEET_HEIGHT - Math.max(insets.bottom, spacing.md);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={Keyboard.dismiss}
        >
          <KeyboardAwareScrollView
            fill={false}
            style={{ height: scrollMaxHeight, maxHeight: scrollMaxHeight }}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            keyboardVerticalOffset={keyboardVerticalOffset}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={bounces}
          >
            {children}
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const modalBottomSheetStyles = StyleSheet.create({
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    maxHeight: MAX_SHEET_HEIGHT,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingRight: spacing.xs,
  },
});
