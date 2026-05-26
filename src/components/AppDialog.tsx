import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Button } from './Button';
import { colors, layout, radius, shadows, spacing, typography } from '../constants/theme';
import type { DialogButton } from '../context/DialogContext';

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  cancelable?: boolean;
  onDismiss: () => void;
}

function getButtonVariant(
  style: DialogButton['style'],
  hasDestructiveAction: boolean
): 'primary' | 'secondary' | 'danger' | 'cancel' {
  switch (style) {
    case 'destructive':
      return 'cancel';
    case 'cancel':
      return hasDestructiveAction ? 'secondary' : 'cancel';
    default:
      return 'primary';
  }
}

export function AppDialog({
  visible,
  title,
  message,
  buttons,
  cancelable = true,
  onDismiss,
}: AppDialogProps) {
  const resolvedButtons =
    buttons.length > 0
      ? buttons
      : [{ text: 'OK', style: 'default' as const }];

  const displayButtons =
    resolvedButtons.length === 2
      ? (() => {
          const cancelButton = resolvedButtons.find(
            (button) => button.style === 'cancel'
          );
          const actionButton = resolvedButtons.find(
            (button) => button.style !== 'cancel'
          );
          if (cancelButton && actionButton) {
            return [cancelButton, actionButton];
          }
          return resolvedButtons;
        })()
      : resolvedButtons;

  const useRowActions = displayButtons.length === 2;
  const hasDestructiveAction = resolvedButtons.some(
    (button) => button.style === 'destructive'
  );

  const handlePress = (button: DialogButton) => {
    onDismiss();
    button.onPress?.();
  };

  const handleBackdropPress = () => {
    if (!cancelable) return;
    const cancelButton = resolvedButtons.find((button) => button.style === 'cancel');
    onDismiss();
    cancelButton?.onPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View
            style={[
              styles.actions,
              useRowActions ? styles.actionsRow : styles.actionsColumn,
            ]}
          >
            {displayButtons.map((button, index) => {
              const label = button.text ?? (button.style === 'cancel' ? 'Cancel' : 'OK');
              return (
                <Button
                  key={`${label}-${index}`}
                  title={label}
                  variant={getButtonVariant(button.style, hasDestructiveAction)}
                  size="md"
                  onPress={() => handlePress(button)}
                  style={useRowActions ? styles.rowButton : styles.columnButton}
                />
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  title: {
    ...typography.heading,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  rowButton: {
    flex: 1,
  },
  columnButton: {
    width: '100%',
  },
});
