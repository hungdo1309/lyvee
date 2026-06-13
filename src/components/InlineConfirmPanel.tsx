import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { colors, layout, radius, shadows, spacing, typography } from '../constants/theme';

interface InlineConfirmPanelProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'money';
  elevated?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function InlineConfirmPanel({
  title,
  message,
  confirmLabel = 'Remove',
  confirmVariant = 'danger',
  elevated = false,
  onConfirm,
  onCancel,
  loading = false,
  error = null,
}: InlineConfirmPanelProps) {
  return (
    <View style={[styles.panel, elevated && styles.panelElevated]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <CancelButton onPress={onCancel} disabled={loading} />
        <Button
          title={confirmLabel}
          variant={confirmVariant}
          onPress={onConfirm}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  panelElevated: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  title: {
    ...typography.label,
    fontSize: 16,
  },
  message: {
    ...typography.caption,
    lineHeight: 20,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
