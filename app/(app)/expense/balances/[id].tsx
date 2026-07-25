import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO, startOfDay } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../src/context/AuthContext';
import { useApp } from '../../../../src/context/AppContext';
import { ScreenBackButton } from '../../../../src/components/ScreenBackButton';
import { LoadingScreen } from '../../../../src/components/LoadingScreen';
import { EmptyState } from '../../../../src/components/EmptyState';
import { Card } from '../../../../src/components/Card';
import { Button } from '../../../../src/components/Button';
import { SettleConfirmPanel } from '../../../../src/components/SettleConfirmPanel';
import { ExpensesIcon, EXPENSES_EMPTY_ICON_WRAP_SIZE, EXPENSES_ICON_SIZE } from '../../../../src/components/ExpensesIcon';
import {
  addSettlement,
  subscribeToExpenseGroup,
  subscribeToExpenseGroupExpenses,
  subscribeToExpenseGroupSettlements,
} from '../../../../src/services/expenseGroups';
import { subscribeToTrip } from '../../../../src/services/trips';
import { useGroupMembers, EMPTY_MEMBER_IDS } from '../../../../src/hooks/useGroupMembers';
import { useExpenseBalances } from '../../../../src/hooks/useExpenseBalances';
import { BalanceTransfer } from '../../../../src/utils/expenseBalances';
import { Expense, ExpenseGroup, ExpenseSettlement } from '../../../../src/types/expenses';
import { Trip } from '../../../../src/types/trips';
import { formatExpenseMoney } from '../../../../src/utils/expenseMoney';
import { canViewExpenseGroup } from '../../../../src/utils/expensePermissions';
import { colors, layout, spacing, typography } from '../../../../src/constants/theme';

export default function ExpenseBalancesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { groups } = useApp();
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<ExpenseSettlement[]>([]);
  const [linkedTrip, setLinkedTrip] = useState<Trip | null>(null);
  const [linkedTripReady, setLinkedTripReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recordingTransferKey, setRecordingTransferKey] = useState<string | null>(null);
  const [pendingSettleTransfer, setPendingSettleTransfer] = useState<BalanceTransfer | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [simplifyDebts, setSimplifyDebts] = useState(false);
  const [paymentHistoryExpanded, setPaymentHistoryExpanded] = useState(false);
  const [balancesExpanded, setBalancesExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsubGroup = subscribeToExpenseGroup(id, (nextGroup) => {
      setExpenseGroup(nextGroup);
      setLoading(false);
    });
    const unsubExpenses = subscribeToExpenseGroupExpenses(id, setExpenses);
    const unsubSettlements = subscribeToExpenseGroupSettlements(id, setSettlements);
    return () => {
      unsubGroup();
      unsubExpenses();
      unsubSettlements();
    };
  }, [id]);

  useEffect(() => {
    if (!expenseGroup?.tripId) {
      setLinkedTrip(null);
      setLinkedTripReady(true);
      return;
    }

    setLinkedTripReady(false);
    const unsubTrip = subscribeToTrip(expenseGroup.tripId, (trip) => {
      setLinkedTrip(trip);
      setLinkedTripReady(true);
    });
    return unsubTrip;
  }, [expenseGroup?.tripId]);

  const group = useMemo(
    () => groups.find((entry) => entry.id === expenseGroup?.groupId) ?? null,
    [groups, expenseGroup?.groupId]
  );
  const { members: groupMembers } = useGroupMembers(group?.members ?? EMPTY_MEMBER_IDS);

  const canView =
    expenseGroup && user ? canViewExpenseGroup(expenseGroup, group, user.id, linkedTrip) : false;

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of groupMembers) {
      map.set(member.id, member.name);
    }
    return map;
  }, [groupMembers]);

  const { balances, transfers } = useExpenseBalances(
    expenseGroup,
    expenses,
    settlements,
    simplifyDebts
  );

  const yourBalance = useMemo(() => {
    if (!user) return 0;
    return balances.find((entry) => entry.userId === user.id)?.netCents ?? 0;
  }, [balances, user]);

  const yourSettlements = useMemo(() => {
    if (!user) return [];
    return settlements
      .filter(
        (settlement) =>
          settlement.fromUserId === user.id || settlement.toUserId === user.id
      )
      .sort((a, b) => {
        const dateCompare = b.settlementDate.localeCompare(a.settlementDate);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [settlements, user]);

  const yourTransfers = useMemo(() => {
    if (!user) return [];
    return transfers.filter(
      (transfer) => transfer.fromUserId === user.id || transfer.toUserId === user.id
    );
  }, [transfers, user]);

  const hasUnsettledBalances = yourTransfers.length > 0;

  useEffect(() => {
    if (hasUnsettledBalances) {
      setBalancesExpanded(true);
    }
  }, [hasUnsettledBalances]);

  const transferKey = (transfer: BalanceTransfer) =>
    `${transfer.fromUserId}-${transfer.toUserId}-${transfer.amountCents}`;

  const startSettle = (transfer: BalanceTransfer) => {
    if (!expenseGroup || !user || transfer.fromUserId !== user.id) return;
    setSettleError(null);
    setPendingSettleTransfer(transfer);
  };

  const confirmSettle = async (amountCents: number) => {
    if (!expenseGroup || !user || !pendingSettleTransfer) return;

    const key = transferKey(pendingSettleTransfer);
    setRecordingTransferKey(key);
    setSettleError(null);
    try {
      await addSettlement(
        expenseGroup,
        {
          fromUserId: pendingSettleTransfer.fromUserId,
          toUserId: pendingSettleTransfer.toUserId,
          amountCents,
          settlementDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        },
        user.id
      );
      setPendingSettleTransfer(null);
    } catch (error) {
      setSettleError(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setRecordingTransferKey(null);
    }
  };

  if (loading || (expenseGroup?.tripId && !linkedTripReady)) {
    return <LoadingScreen />;
  }

  if (!expenseGroup || !canView) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingHorizontal: layout.screenPadding }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.header}>
          <ScreenBackButton label="Back" showChevron onPress={() => router.back()} style={styles.headerBackButton} />
          <Text style={styles.title}>Balances</Text>
        </View>
        <EmptyState
          iconNode={<ExpensesIcon size={EXPENSES_ICON_SIZE.emptyLarge} />}
          title="Expense group not found"
          subtitle="This expense group may have been deleted or you do not have access."
          compact
          iconWrapSize={EXPENSES_EMPTY_ICON_WRAP_SIZE}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <ScreenBackButton label="Back" showChevron onPress={() => router.back()} style={styles.headerBackButton} />
          <Text style={styles.title}>Balances</Text>
        </View>

        <View style={styles.content}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Your balance</Text>
          <Text
            style={[
              styles.summaryValue,
              yourBalance > 0 && styles.balancePositive,
              yourBalance < 0 && styles.balanceNegative,
            ]}
          >
            {yourBalance === 0
              ? 'Settled up'
              : yourBalance > 0
                ? `You are owed ${formatExpenseMoney(yourBalance, expenseGroup.currency)}`
                : `You owe ${formatExpenseMoney(Math.abs(yourBalance), expenseGroup.currency)}`}
          </Text>
        </Card>

        {transfers.length > 0 || balances.some((entry) => entry.netCents !== 0) ? (
          <Card style={styles.simplifyCard}>
            <View style={styles.simplifyRow}>
              <View style={styles.simplifyTextWrap}>
                <Text style={styles.simplifyLabel}>Simplify debts</Text>
                <Text style={styles.simplifyHint}>Combines debts between members</Text>
              </View>
              <Switch
                value={simplifyDebts}
                onValueChange={setSimplifyDebts}
                trackColor={{ false: colors.border, true: colors.primaryMuted }}
                thumbColor={simplifyDebts ? colors.primary : colors.surface}
                ios_backgroundColor={colors.border}
                accessibilityLabel="Simplify debts"
              />
            </View>
          </Card>
        ) : null}

        {yourSettlements.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeaderRow}
              onPress={() => setPaymentHistoryExpanded((value) => !value)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ expanded: paymentHistoryExpanded }}
            >
              <Text style={styles.sectionHeading}>
                Payment history ({yourSettlements.length})
              </Text>
              <Ionicons
                name={paymentHistoryExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {paymentHistoryExpanded
              ? yourSettlements.map((settlement) => {
                  const amountLabel = formatExpenseMoney(
                    settlement.amountCents,
                    expenseGroup.currency
                  );
                  const label =
                    settlement.fromUserId === user?.id
                      ? `You paid ${memberNameById.get(settlement.toUserId) ?? 'Member'} ${amountLabel}`
                      : `${memberNameById.get(settlement.fromUserId) ?? 'Member'} paid you ${amountLabel}`;

                  return (
                    <View key={settlement.id} style={styles.settlementBlock}>
                      <View style={styles.settlementRow}>
                        <View style={styles.settlementContent}>
                          <Text style={styles.settlementText}>{label}</Text>
                          <Text style={styles.settlementDate}>
                            {format(parseISO(settlement.settlementDate), 'MMM d, yyyy')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            onPress={() => {
              if (!hasUnsettledBalances) {
                setBalancesExpanded((value) => !value);
              }
            }}
            activeOpacity={hasUnsettledBalances ? 1 : 0.85}
            accessibilityRole="button"
            accessibilityState={{ expanded: hasUnsettledBalances || balancesExpanded }}
            disabled={hasUnsettledBalances}
          >
            <Text style={styles.sectionHeading}>
              Balances{yourTransfers.length > 0 ? ` (${yourTransfers.length})` : ''}
            </Text>
            {hasUnsettledBalances ? null : (
              <Ionicons
                name={balancesExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            )}
          </TouchableOpacity>
          {hasUnsettledBalances || balancesExpanded ? (
            yourTransfers.length === 0 ? (
              <Text style={styles.allSettled}>You're settled up</Text>
            ) : (
              yourTransfers.map((transfer) => {
                const key = transferKey(transfer);
                const isRecording = recordingTransferKey === key;
                const isYourDebt = transfer.fromUserId === user?.id;
                const isConfirming =
                  pendingSettleTransfer != null && transferKey(pendingSettleTransfer) === key;
                const fromName = memberNameById.get(transfer.fromUserId) ?? 'Member';
                const toName = memberNameById.get(transfer.toUserId) ?? 'Member';
                const amountLabel = formatExpenseMoney(transfer.amountCents, expenseGroup.currency);
                const balanceLabel = isYourDebt
                  ? `You owe ${toName} ${amountLabel}`
                  : `${fromName} owes you ${amountLabel}`;

                return (
                  <View key={key} style={styles.balanceBlock}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceRowName}>{balanceLabel}</Text>
                      {isYourDebt && !isConfirming ? (
                        <Button
                          title="Settle"
                          variant="money"
                          size="sm"
                          onPress={() => startSettle(transfer)}
                          style={styles.settleButton}
                        />
                      ) : null}
                    </View>
                    {isConfirming ? (
                      <SettleConfirmPanel
                        title="Settle up?"
                        message={`Record a payment to ${toName}.`}
                        currency={expenseGroup.currency}
                        maxAmountCents={transfer.amountCents}
                        partialHint="Partial payments apply to your oldest unsettled expenses first."
                        confirmLabel="Record payment"
                        elevated
                        loading={isRecording}
                        error={settleError}
                        onConfirm={confirmSettle}
                        onCancel={() => {
                          setPendingSettleTransfer(null);
                          setSettleError(null);
                        }}
                      />
                    ) : null}
                  </View>
                );
              })
            )
          ) : null}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingBottom: spacing.md,
  },
  headerBackButton: {
    marginBottom: 0,
  },
  content: {
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
    color: colors.primaryDark,
    marginTop: spacing.xs,
  },
  summaryCard: {
    gap: spacing.xs,
    marginBottom: 0,
  },
  summaryLabel: {
    ...typography.sectionTitle,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  simplifyCard: {
    gap: spacing.xs,
    marginBottom: 0,
  },
  simplifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  simplifyTextWrap: {
    flex: 1,
    gap: 2,
  },
  simplifyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  simplifyHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  balancePositive: {
    color: colors.success,
  },
  balanceNegative: {
    color: colors.error,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.heading,
    fontSize: 18,
    flex: 1,
    marginBottom: 0,
  },
  allSettled: {
    fontSize: 14,
    color: colors.textMuted,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  settlementBlock: {
    gap: spacing.xs,
  },
  settlementContent: {
    flex: 1,
    gap: 2,
  },
  settlementText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  settlementDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  balanceBlock: {
    gap: spacing.xs,
  },
  balanceRowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settleButton: {
    flexShrink: 0,
  },
});
