import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { Expense, ExpenseGroup, ExpenseSplitMode, PERCENTAGE_SCALE } from '../types/expenses';
import { User } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { InlineConfirmPanel } from './InlineConfirmPanel';
import { SettleConfirmPanel } from './SettleConfirmPanel';
import { ItemDateTimeField } from './ItemDateTimeField';
import {
  formatExpenseMoney,
  formatExpenseAmountInput,
  parseExpenseAmountToCents,
} from '../utils/expenseMoney';
import {
  buildDefaultSplitValues,
  computeExpensePortionsCents,
  EXPENSE_SPLIT_MODE_LABELS,
  EXPENSE_SPLIT_MODES,
  formatPercentageInput,
  parseExactSplitInput,
  parsePercentageInput,
} from '../utils/expenseSplits';
import { colors, radius, spacing, typography } from '../constants/theme';

export interface ExpenseEditorValues {
  description: string;
  amountCents: number;
  paidByUserId: string;
  splitAmongUserIds: string[];
  splitMode: ExpenseSplitMode;
  splitValues?: Record<string, number>;
  expenseDate: string;
}

interface ExpenseEditorProps {
  visible: boolean;
  expenseGroup: ExpenseGroup;
  members: User[];
  initialExpense?: Expense | null;
  readOnly?: boolean;
  onEdit?: () => void;
  onSettle?: (amountCents: number) => void | Promise<void>;
  onUnsettle?: () => void | Promise<void>;
  onSettleForMember?: (userId: string, amountCents: number) => void | Promise<void>;
  onUnsettleForMember?: (userId: string) => void | Promise<void>;
  yourShareCents?: number | null;
  settleAmountCents?: number | null;
  expenseSettled?: boolean;
  /** Remaining unpaid share per member (read-only). Missing key = full share still owed. */
  shareRemainingByUserId?: Map<string, number> | null;
  memberSettleDebtors?: Array<{ userId: string; name: string; remainingCents: number }>;
  memberUnsettleTargets?: Array<{ userId: string; name: string }>;
  showNotInvolved?: boolean;
  onClose: () => void;
  onSave: (values: ExpenseEditorValues) => Promise<void>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SplitMemberInputRow({
  name,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  prefix,
  suffix,
}: {
  name: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  placeholder: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.splitMemberRow}>
      <Text style={styles.splitMemberName} numberOfLines={2}>
        {name}
      </Text>
      <View style={styles.splitMemberInputWrap}>
        {prefix ? <Text style={styles.splitMemberAffix}>{prefix}</Text> : null}
        <TextInput
          style={styles.splitMemberInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        {suffix ? <Text style={styles.splitMemberAffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function splitInputsFromExpense(
  expense: Expense,
  participantIds: string[]
): Record<string, string> {
  const mode = expense.splitMode ?? 'equal';
  const values = expense.splitValues ?? {};
  const inputs: Record<string, string> = {};

  for (const userId of participantIds) {
    if (mode === 'exact') {
      inputs[userId] = formatExpenseAmountInput(values[userId] ?? 0);
    } else if (mode === 'percentage') {
      inputs[userId] = formatPercentageInput(values[userId] ?? 0);
    } else if (mode === 'shares') {
      inputs[userId] = String(values[userId] ?? 1);
    }
  }

  return inputs;
}

export function ExpenseEditor({
  visible,
  expenseGroup,
  members,
  initialExpense = null,
  readOnly = false,
  onEdit,
  onSettle,
  onUnsettle,
  onSettleForMember,
  onUnsettleForMember,
  yourShareCents = null,
  settleAmountCents = null,
  expenseSettled = false,
  shareRemainingByUserId = null,
  memberSettleDebtors = [],
  memberUnsettleTargets = [],
  showNotInvolved = false,
  onClose,
  onSave,
}: ExpenseEditorProps) {
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? insets.top + spacing.md : 0),
    [insets.top]
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [splitAmongUserIds, setSplitAmongUserIds] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<ExpenseSplitMode>('equal');
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [showUnsettleConfirm, setShowUnsettleConfirm] = useState(false);
  const [pendingMemberSettle, setPendingMemberSettle] = useState<{
    userId: string;
    name: string;
    amountCents: number;
  } | null>(null);
  const [pendingMemberUnsettle, setPendingMemberUnsettle] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settlingShare, setSettlingShare] = useState(false);
  const [unsettlingShare, setUnsettlingShare] = useState(false);

  const groupMembers = useMemo(
    () =>
      expenseGroup.memberIds
        .map((id) => members.find((member) => member.id === id))
        .filter((member): member is User => Boolean(member)),
    [expenseGroup.memberIds, members]
  );

  useEffect(() => {
    if (!visible) return;
    if (initialExpense) {
      const participants =
        initialExpense.splitAmongUserIds.length > 0
          ? initialExpense.splitAmongUserIds
          : expenseGroup.memberIds;
      setDescription(initialExpense.description);
      setAmount(formatExpenseAmountInput(initialExpense.amountCents));
      setPaidByUserId(initialExpense.paidByUserId);
      setSplitAmongUserIds(participants);
      setSplitMode(initialExpense.splitMode ?? 'equal');
      setSplitInputs(splitInputsFromExpense(initialExpense, participants));
      setExpenseDate(parseISO(initialExpense.expenseDate));
    } else {
      setDescription('');
      setAmount('');
      setPaidByUserId(groupMembers[0]?.id ?? '');
      setSplitAmongUserIds(expenseGroup.memberIds);
      setSplitMode('equal');
      setSplitInputs({});
      setExpenseDate(new Date());
    }
    setError(null);
  }, [visible, initialExpense, expenseGroup.memberIds, groupMembers]);

  useEffect(() => {
    if (!visible) {
      setShowSettleConfirm(false);
      setShowUnsettleConfirm(false);
      setPendingMemberSettle(null);
      setPendingMemberUnsettle(null);
      setSettleError(null);
    }
  }, [visible]);

  const isEditing = Boolean(initialExpense);
  const amountCents = parseExpenseAmountToCents(amount);

  const applySplitMode = (mode: ExpenseSplitMode, participantIds = splitAmongUserIds) => {
    setSplitMode(mode);
    if (mode === 'equal' || !amountCents || participantIds.length === 0) {
      setSplitInputs({});
      return;
    }

    const defaults = buildDefaultSplitValues(mode, participantIds, amountCents);
    const nextInputs: Record<string, string> = {};
    for (const userId of participantIds) {
      if (mode === 'exact') {
        nextInputs[userId] = formatExpenseAmountInput(defaults[userId] ?? 0);
      } else if (mode === 'percentage') {
        nextInputs[userId] = formatPercentageInput(defaults[userId] ?? 0);
      } else {
        nextInputs[userId] = String(defaults[userId] ?? 1);
      }
    }
    setSplitInputs(nextInputs);
  };

  const toggleSplitMember = (memberId: string) => {
    setSplitAmongUserIds((current) => {
      const next = current.includes(memberId)
        ? current.length === 1
          ? current
          : current.filter((id) => id !== memberId)
        : [...current, memberId];

      if (splitMode !== 'equal' && amountCents) {
        const defaults = buildDefaultSplitValues(splitMode, next, amountCents);
        const nextInputs: Record<string, string> = {};
        for (const userId of next) {
          if (splitMode === 'exact') {
            nextInputs[userId] = formatExpenseAmountInput(defaults[userId] ?? 0);
          } else if (splitMode === 'percentage') {
            nextInputs[userId] = formatPercentageInput(defaults[userId] ?? 0);
          } else {
            nextInputs[userId] = String(defaults[userId] ?? 1);
          }
        }
        setSplitInputs(nextInputs);
      }

      return next;
    });
  };

  const updateSplitInput = (userId: string, value: string) => {
    setSplitInputs((current) => ({ ...current, [userId]: value }));
  };

  const buildSplitValues = (): Record<string, number> | undefined => {
    if (splitMode === 'equal') return undefined;

    const values: Record<string, number> = {};
    for (const userId of splitAmongUserIds) {
      const raw = splitInputs[userId] ?? '';
      if (splitMode === 'exact') {
        const cents = parseExactSplitInput(raw);
        if (cents == null) throw new Error('Enter a valid amount for each person');
        values[userId] = cents;
      } else if (splitMode === 'percentage') {
        const basisPoints = parsePercentageInput(raw);
        if (basisPoints == null) throw new Error('Enter a valid percentage for each person');
        values[userId] = basisPoints;
      } else {
        const shares = Number.parseInt(raw.trim(), 10);
        if (!Number.isInteger(shares) || shares < 1) {
          throw new Error('Each person needs at least 1 share');
        }
        values[userId] = shares;
      }
    }
    return values;
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setError('Enter a description');
      return;
    }
    if (amountCents == null || amountCents <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!paidByUserId) {
      setError('Choose who paid');
      return;
    }
    if (splitAmongUserIds.length === 0) {
      setError('Choose at least one person to split with');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const splitValues = buildSplitValues();
      await onSave({
        description: description.trim(),
        amountCents,
        paidByUserId,
        splitAmongUserIds,
        splitMode,
        splitValues,
        expenseDate: format(expenseDate, 'yyyy-MM-dd'),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save expense');
    } finally {
      setLoading(false);
    }
  };

  const previewPortions = useMemo(() => {
    if (!amountCents || splitAmongUserIds.length === 0) return null;
    try {
      const splitValues = buildSplitValues();
      return computeExpensePortionsCents(
        {
          amountCents,
          splitAmongUserIds,
          splitMode,
          splitValues,
        },
        expenseGroup.memberIds
      );
    } catch {
      return null;
    }
  }, [amountCents, splitAmongUserIds, splitMode, splitInputs, expenseGroup.memberIds]);

  const percentageTotal = useMemo(() => {
    if (splitMode !== 'percentage') return null;
    return splitAmongUserIds.reduce((sum, userId) => {
      const basisPoints = parsePercentageInput(splitInputs[userId] ?? '');
      return sum + (basisPoints ?? 0);
    }, 0);
  }, [splitMode, splitAmongUserIds, splitInputs]);

  const exactTotalCents = useMemo(() => {
    if (splitMode !== 'exact') return null;
    return splitAmongUserIds.reduce((sum, userId) => {
      const cents = parseExactSplitInput(splitInputs[userId] ?? '');
      return sum + (cents ?? 0);
    }, 0);
  }, [splitMode, splitAmongUserIds, splitInputs]);

  if (readOnly && initialExpense) {
    const paidByMember = groupMembers.find((member) => member.id === initialExpense.paidByUserId);
    const participants =
      initialExpense.splitAmongUserIds.length > 0
        ? initialExpense.splitAmongUserIds
            .map((id) => groupMembers.find((member) => member.id === id))
            .filter((member): member is User => Boolean(member))
        : groupMembers;
    const splitModeLabel =
      EXPENSE_SPLIT_MODE_LABELS[initialExpense.splitMode ?? 'equal'] ?? 'Equal';
    const portions = computeExpensePortionsCents(initialExpense, expenseGroup.memberIds);

    return (
      <ModalBottomSheet
        visible={visible}
        onClose={onClose}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={modalBottomSheetStyles.handle} />
        <Text style={styles.title}>Expense Details</Text>

        <DetailField label="Description" value={initialExpense.description} />
        <DetailField
          label="Amount"
          value={formatExpenseMoney(initialExpense.amountCents, expenseGroup.currency)}
        />
        <DetailField label="Paid by" value={paidByMember?.name ?? 'Member'} />
        <DetailField label="Split type" value={splitModeLabel} />
        <DetailField
          label="Split with"
          value={
            participants.length > 0
              ? participants.map((member) => member.name).join(', ')
              : 'Everyone'
          }
        />
        <DetailField
          label="Date"
          value={format(parseISO(initialExpense.expenseDate), 'MMM d, yyyy')}
        />

        {showNotInvolved ? (
          <Text style={styles.notInvolved}>Not involved</Text>
        ) : null}

        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Split breakdown</Text>
          <View style={styles.previewList}>
            {participants.map((member) => {
              const shareCents = portions.get(member.id) ?? 0;
              const isPayer = member.id === initialExpense.paidByUserId;
              const shareLabel = formatExpenseMoney(shareCents, expenseGroup.currency);

              if (isPayer) {
                return (
                  <Text key={member.id} style={styles.previewRow}>
                    {member.name}: {shareLabel}
                    <Text style={styles.previewPaymentMeta}> · paid the bill</Text>
                  </Text>
                );
              }

              if (shareCents <= 0) {
                return (
                  <Text key={member.id} style={styles.previewRow}>
                    {member.name}: {shareLabel}
                  </Text>
                );
              }

              const remainingCents =
                shareRemainingByUserId?.get(member.id) ?? shareCents;
              const paidCents = Math.max(0, shareCents - remainingCents);

              if (remainingCents <= 0) {
                return (
                  <Text key={member.id} style={styles.previewRow}>
                    {member.name}: {shareLabel}
                    <Text style={styles.previewPaymentMeta}> · settled</Text>
                  </Text>
                );
              }

              if (paidCents > 0) {
                return (
                  <Text key={member.id} style={styles.previewRow}>
                    {member.name}: {shareLabel}
                    <Text style={styles.previewPaymentMeta}>
                      {' '}
                      · paid {formatExpenseMoney(paidCents, expenseGroup.currency)}, owes{' '}
                      {formatExpenseMoney(remainingCents, expenseGroup.currency)}
                    </Text>
                  </Text>
                );
              }

              return (
                <Text key={member.id} style={styles.previewRow}>
                  {member.name}: {shareLabel}
                </Text>
              );
            })}
          </View>
        </View>

        {yourShareCents != null ? (
          <View style={styles.settleSection}>
            <Text style={styles.settleLabel}>
              {expenseSettled
                ? 'Your share'
                : settleAmountCents != null && settleAmountCents < yourShareCents
                  ? 'You still owe'
                  : 'Your share'}
            </Text>
            {expenseSettled ? (
              <Text style={styles.settleSettled}>Settled</Text>
            ) : (
              <View style={styles.settleAmountBlock}>
                <Text style={styles.settleAmount}>
                  {formatExpenseMoney(settleAmountCents ?? yourShareCents, expenseGroup.currency)}
                </Text>
                {settleAmountCents != null && settleAmountCents < yourShareCents ? (
                  <Text style={styles.settleOriginalShare}>
                    of {formatExpenseMoney(yourShareCents, expenseGroup.currency)} share
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {memberSettleDebtors.length > 0 && onSettleForMember ? (
          <View style={styles.memberSettleSection}>
            <Text style={styles.settleLabel}>Unsettled shares</Text>
            {memberSettleDebtors.map((debtor) => {
              const isConfirming =
                pendingMemberSettle?.userId === debtor.userId &&
                !showSettleConfirm &&
                !showUnsettleConfirm &&
                !pendingMemberUnsettle;
              return (
                <View key={debtor.userId} style={styles.memberSettleRow}>
                  <Text style={styles.memberSettleText}>
                    {debtor.name} owes{' '}
                    {formatExpenseMoney(debtor.remainingCents, expenseGroup.currency)}
                  </Text>
                  {!isConfirming ? (
                    <Button
                      title="Settle"
                      variant="money"
                      size="sm"
                      onPress={() => {
                        setSettleError(null);
                        setPendingMemberSettle({
                          userId: debtor.userId,
                          name: debtor.name,
                          amountCents: debtor.remainingCents,
                        });
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {memberUnsettleTargets.length > 0 && onUnsettleForMember ? (
          <View style={styles.memberSettleSection}>
            <Text style={styles.settleLabel}>Settled shares</Text>
            {memberUnsettleTargets.map((target) => {
              const isConfirming =
                pendingMemberUnsettle?.userId === target.userId &&
                !showSettleConfirm &&
                !showUnsettleConfirm &&
                !pendingMemberSettle;
              return (
                <View key={target.userId} style={styles.memberSettleRow}>
                  <Text style={styles.memberSettleText}>{target.name} — Settled</Text>
                  {!isConfirming ? (
                    <Button
                      title="Unsettle"
                      variant="cancel"
                      size="sm"
                      onPress={() => {
                        setSettleError(null);
                        setPendingMemberUnsettle(target);
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {!(
          showSettleConfirm ||
          showUnsettleConfirm ||
          pendingMemberSettle ||
          pendingMemberUnsettle
        ) ? (
          <View style={styles.detailActions}>
            {onSettle ? (
              <Button title="Settle" variant="money" onPress={() => setShowSettleConfirm(true)} />
            ) : null}
            {onUnsettle ? (
              <Button title="Unsettle" variant="cancel" onPress={() => setShowUnsettleConfirm(true)} />
            ) : null}
            {onEdit ? <Button title="Edit expense" onPress={onEdit} /> : null}
            <Button title="Close" variant="secondary" onPress={onClose} />
          </View>
        ) : null}

        {pendingMemberUnsettle && onUnsettleForMember ? (
          <InlineConfirmPanel
            title="Unsettle?"
            message={`Remove ${pendingMemberUnsettle.name}'s recorded payment for "${initialExpense.description}"? Their share will show as unpaid again.`}
            confirmLabel="Unsettle"
            confirmVariant="danger"
            elevated
            loading={unsettlingShare}
            error={settleError}
            onConfirm={async () => {
              setSettleError(null);
              setUnsettlingShare(true);
              try {
                await onUnsettleForMember(pendingMemberUnsettle.userId);
                setPendingMemberUnsettle(null);
              } catch (err) {
                setSettleError(
                  err instanceof Error ? err.message : 'Failed to remove payment'
                );
              } finally {
                setUnsettlingShare(false);
              }
            }}
            onCancel={() => {
              setPendingMemberUnsettle(null);
              setSettleError(null);
            }}
          />
        ) : null}

        {pendingMemberSettle && onSettleForMember ? (
          <SettleConfirmPanel
            title="Settle up?"
            message={`Record a payment from ${pendingMemberSettle.name} to ${
              paidByMember?.name ?? 'Member'
            } for "${initialExpense.description}".`}
            currency={expenseGroup.currency}
            maxAmountCents={pendingMemberSettle.amountCents}
            confirmLabel="Record payment"
            elevated
            loading={settlingShare}
            error={settleError}
            onConfirm={async (amountCents) => {
              setSettleError(null);
              setSettlingShare(true);
              try {
                await onSettleForMember(pendingMemberSettle.userId, amountCents);
                setPendingMemberSettle(null);
              } catch (err) {
                setSettleError(
                  err instanceof Error ? err.message : 'Failed to record payment'
                );
              } finally {
                setSettlingShare(false);
              }
            }}
            onCancel={() => {
              setPendingMemberSettle(null);
              setSettleError(null);
            }}
          />
        ) : null}

        {showSettleConfirm && onSettle ? (
          <SettleConfirmPanel
            title="Settle up?"
            message={`Record a payment to ${paidByMember?.name ?? 'Member'} for "${initialExpense.description}".`}
            currency={expenseGroup.currency}
            maxAmountCents={settleAmountCents ?? yourShareCents ?? 0}
            confirmLabel="Record payment"
            elevated
            loading={settlingShare}
            error={settleError}
            onConfirm={async (amountCents) => {
              setSettleError(null);
              setSettlingShare(true);
              try {
                await onSettle(amountCents);
                setShowSettleConfirm(false);
              } catch (err) {
                setSettleError(
                  err instanceof Error ? err.message : 'Failed to record payment'
                );
              } finally {
                setSettlingShare(false);
              }
            }}
            onCancel={() => {
              setShowSettleConfirm(false);
              setSettleError(null);
            }}
          />
        ) : null}

        {showUnsettleConfirm && onUnsettle ? (
          <InlineConfirmPanel
            title="Unsettle?"
            message={`Remove your recorded payment for "${initialExpense.description}"? Your share will show as unpaid again.`}
            confirmLabel="Unsettle"
            confirmVariant="danger"
            elevated
            loading={unsettlingShare}
            error={settleError}
            onConfirm={async () => {
              setSettleError(null);
              setUnsettlingShare(true);
              try {
                await onUnsettle();
                setShowUnsettleConfirm(false);
              } catch (err) {
                setSettleError(
                  err instanceof Error ? err.message : 'Failed to remove payment'
                );
              } finally {
                setUnsettlingShare(false);
              }
            }}
            onCancel={() => {
              setShowUnsettleConfirm(false);
              setSettleError(null);
            }}
          />
        ) : null}
      </ModalBottomSheet>
    );
  }

  return (
    <ModalBottomSheet
      visible={visible}
      onClose={onClose}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={modalBottomSheetStyles.handle} />
      <Text style={styles.title}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>

      <Input label="Description" value={description} onChangeText={setDescription} />
      <Input
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      <Text style={styles.sectionLabel}>Paid by</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {groupMembers.map((member) => (
          <OptionChip
            key={member.id}
            label={member.name}
            selected={paidByUserId === member.id}
            onPress={() => setPaidByUserId(member.id)}
          />
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Split type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {EXPENSE_SPLIT_MODES.map((mode) => (
          <OptionChip
            key={mode}
            label={EXPENSE_SPLIT_MODE_LABELS[mode]}
            selected={splitMode === mode}
            onPress={() => applySplitMode(mode)}
          />
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Split with</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {groupMembers.map((member) => (
          <OptionChip
            key={member.id}
            label={member.name}
            selected={splitAmongUserIds.includes(member.id)}
            onPress={() => toggleSplitMember(member.id)}
          />
        ))}
      </ScrollView>

      {splitMode !== 'equal' ? (
        <View style={styles.splitDetails}>
          {splitAmongUserIds.map((userId) => {
            const member = groupMembers.find((entry) => entry.id === userId);
            if (!member) return null;

            return (
              <SplitMemberInputRow
                key={userId}
                name={member.name}
                value={splitInputs[userId] ?? ''}
                onChangeText={(text) => updateSplitInput(userId, text)}
                keyboardType={splitMode === 'shares' ? 'number-pad' : 'decimal-pad'}
                placeholder={
                  splitMode === 'exact' ? '0.00' : splitMode === 'percentage' ? '0' : '1'
                }
                prefix={splitMode === 'exact' ? '$' : undefined}
                suffix={
                  splitMode === 'percentage'
                    ? '%'
                    : splitMode === 'shares'
                      ? (() => {
                          const shareCount = Number.parseInt(splitInputs[userId] ?? '1', 10);
                          return !Number.isFinite(shareCount) || shareCount === 1
                            ? 'share'
                            : 'shares';
                        })()
                      : undefined
                }
              />
            );
          })}
          {splitMode === 'percentage' && percentageTotal != null ? (
            <Text
              style={[
                styles.splitHint,
                percentageTotal !== PERCENTAGE_SCALE && styles.splitHintWarning,
              ]}
            >
              Total: {(percentageTotal / 100).toFixed(2)}% (must equal 100%)
            </Text>
          ) : null}
          {splitMode === 'exact' && exactTotalCents != null && amountCents ? (
            <Text
              style={[
                styles.splitHint,
                exactTotalCents !== amountCents && styles.splitHintWarning,
              ]}
            >
              Total: {formatExpenseMoney(exactTotalCents, expenseGroup.currency)} (must equal{' '}
              {formatExpenseMoney(amountCents, expenseGroup.currency)})
            </Text>
          ) : null}
        </View>
      ) : null}

      <ItemDateTimeField
        value={expenseDate}
        onChange={setExpenseDate}
        dateOnly
        sheetTitle="Expense date"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>
          {splitMode === 'equal' ? 'Each person pays' : 'Split preview'}
        </Text>
        {splitMode === 'equal' ? (
          <Text style={styles.previewValue}>
            {amountCents && splitAmongUserIds.length > 0
              ? formatExpenseMoney(
                  Math.round(amountCents / splitAmongUserIds.length),
                  expenseGroup.currency
                )
              : '—'}
          </Text>
        ) : previewPortions ? (
          <View style={styles.previewList}>
            {splitAmongUserIds.map((userId) => {
              const member = groupMembers.find((entry) => entry.id === userId);
              return (
                <Text key={userId} style={styles.previewRow}>
                  {member?.name ?? 'Member'}:{' '}
                  {formatExpenseMoney(
                    previewPortions.get(userId) ?? 0,
                    expenseGroup.currency
                  )}
                </Text>
              );
            })}
          </View>
        ) : (
          <Text style={styles.previewValue}>—</Text>
        )}
      </View>

      <Button title={isEditing ? 'Save changes' : 'Save expense'} onPress={handleSave} loading={loading} />
      <Button title="Cancel" variant="secondary" onPress={onClose} style={styles.cancelButton} />
    </ModalBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.heading,
    fontSize: 22,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  chipRow: {
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primaryDark,
  },
  splitDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitMemberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  splitMemberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  splitMemberInput: {
    width: 88,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  splitMemberAffix: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  splitHint: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  splitHintWarning: {
    color: colors.error,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  preview: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  previewLabel: {
    ...typography.sectionTitle,
  },
  previewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  previewList: {
    gap: 4,
  },
  previewRow: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  previewPaymentMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  detailField: {
    marginBottom: spacing.md,
    gap: 4,
  },
  detailLabel: {
    ...typography.sectionTitle,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settleSection: {
    borderRadius: radius.lg,
    backgroundColor: colors.moneyMuted,
    borderWidth: 1,
    borderColor: colors.money,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  settleLabel: {
    ...typography.sectionTitle,
  },
  settleAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  settleAmountBlock: {
    gap: 2,
  },
  settleOriginalShare: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  settleSettled: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  notInvolved: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  memberSettleSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  memberSettleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  memberSettleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  detailActions: {
    gap: spacing.sm,
  },
});
