import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { Input } from './Input';
import {
  scrollElementIntoView,
  useScrollIntoView,
} from './KeyboardAwareScrollView';
import {
  formatExpenseAmountInput,
  formatExpenseMoney,
  getSettlementAmountError,
  normalizeExpenseAmountInput,
  parseExpenseAmountToCents,
} from '../utils/expenseMoney';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';

interface SettleConfirmPanelProps {
  title: string;
  message: string;
  currency: string;
  maxAmountCents: number;
  partialHint?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'money';
  elevated?: boolean;
  onConfirm: (amountCents: number) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SettleConfirmPanel({
  title,
  message,
  currency,
  maxAmountCents,
  partialHint,
  confirmLabel = 'Record payment',
  confirmVariant = 'money',
  elevated = false,
  onConfirm,
  onCancel,
  loading = false,
  error: externalError = null,
}: SettleConfirmPanelProps) {
  const panelRef = useRef<View>(null);
  const scrollIntoView = useScrollIntoView();
  const [amountInput, setAmountInput] = useState(() => formatExpenseAmountInput(maxAmountCents));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setAmountInput(formatExpenseAmountInput(maxAmountCents));
    setValidationError(null);
  }, [maxAmountCents]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollElementIntoView(scrollIntoView, panelRef.current);
    });
  }, [scrollIntoView]);

  const handleConfirm = async () => {
    const normalizedInput = normalizeExpenseAmountInput(amountInput);
    if (normalizedInput !== amountInput) {
      setAmountInput(normalizedInput);
    }

    const amountCents = parseExpenseAmountToCents(normalizedInput);
    const validation = getSettlementAmountError(amountCents, maxAmountCents);
    if (validation) {
      setValidationError(validation);
      return;
    }
    setValidationError(null);
    await onConfirm(amountCents!);
  };

  const displayError = validationError ?? externalError;

  return (
    <View
      ref={panelRef}
      collapsable={false}
      style={[styles.panel, elevated && styles.panelElevated]}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Input
        label="Amount"
        value={amountInput}
        onChangeText={(text) => {
          setAmountInput(text);
          if (validationError) setValidationError(null);
        }}
        onBlur={() => {
          setAmountInput((current) => normalizeExpenseAmountInput(current));
        }}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <Text style={styles.maxHint}>
        Remaining: {formatExpenseMoney(maxAmountCents, currency)}
      </Text>
      {partialHint ? <Text style={styles.partialHint}>{partialHint}</Text> : null}
      {displayError ? <Text style={styles.error}>{displayError}</Text> : null}
      <View style={styles.actions}>
        <CancelButton onPress={onCancel} disabled={loading} />
        <Button
          title={confirmLabel}
          variant={confirmVariant}
          onPress={handleConfirm}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  panelElevated: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  message: {
    ...typography.caption,
    lineHeight: 20,
  },
  maxHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  partialHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
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
