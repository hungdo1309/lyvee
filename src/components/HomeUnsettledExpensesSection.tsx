import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, parseISO, startOfDay } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Card } from './Card';
import { Button } from './Button';
import { InlineConfirmPanel } from './InlineConfirmPanel';
import { ExpensesIcon } from './ExpensesIcon';
import { addSettlement } from '../services/expenseGroups';
import { formatExpenseMoney } from '../utils/expenseMoney';
import { formatExpenseSplitSummary } from '../utils/expenseSplits';
import { HomeSettleExpenseEntry } from '../utils/homeSettleExpenses';
import { colors, layout, radius, spacing, typography } from '../constants/theme';

interface PendingSettle {
  entryKey: string;
  debtorUserId: string;
  remainingCents: number;
}

interface HomeUnsettledExpensesSectionProps {
  entries: HomeSettleExpenseEntry[];
  memberNameById: Map<string, string>;
  viewerUserId: string;
  isManager: boolean;
  onSettled?: () => void;
}

function entryKey(entry: HomeSettleExpenseEntry) {
  return `${entry.expenseGroup.id}:${entry.expense.id}`;
}

export function HomeUnsettledExpensesSection({
  entries,
  memberNameById,
  viewerUserId,
  isManager,
  onSettled,
}: HomeUnsettledExpensesSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [pendingSettle, setPendingSettle] = useState<PendingSettle | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const pendingEntry = useMemo(() => {
    if (!pendingSettle) return null;
    return entries.find((entry) => entryKey(entry) === pendingSettle.entryKey) ?? null;
  }, [entries, pendingSettle]);

  if (entries.length === 0) return null;

  const confirmSettle = async () => {
    if (!pendingSettle || !pendingEntry) return;

    setSettling(true);
    setSettleError(null);
    try {
      await addSettlement(
        pendingEntry.expenseGroup,
        {
          expenseId: pendingEntry.expense.id,
          fromUserId: pendingSettle.debtorUserId,
          toUserId: pendingEntry.expense.paidByUserId,
          amountCents: pendingSettle.remainingCents,
          settlementDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        },
        viewerUserId
      );
      setPendingSettle(null);
      onSettled?.();
    } catch (error) {
      setSettleError(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeading}>Unsettled</Text>
      </View>
      <View style={styles.list}>
        <View style={[styles.section, styles.sectionHasItems]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            onPress={() => setExpanded((value) => !value)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            <View style={styles.sectionHeaderContent}>
              <ExpensesIcon size={18} color={colors.warning} />
              <Text style={styles.sectionHeaderText}>
                {entries.length} expense{entries.length === 1 ? '' : 's'} to settle
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.warning}
            />
          </TouchableOpacity>

          {expanded
            ? entries.map((entry) => {
                const key = entryKey(entry);
                const payerName =
                  memberNameById.get(entry.expense.paidByUserId) ?? 'Member';
                const isConfirmingThis = pendingSettle?.entryKey === key;

                return (
                  <View key={key} style={styles.cardWrap}>
                    <Card
                      style={styles.expenseCard}
                      onPress={() =>
                        router.push(`/(app)/expense/${entry.expenseGroup.id}` as Href)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`View ${entry.expense.description}`}
                    >
                      <View style={styles.expenseTopRow}>
                        <View style={styles.expenseContent}>
                          <Text style={styles.expenseTitle}>{entry.expense.description}</Text>
                          <Text style={styles.expenseMeta}>
                            {format(parseISO(entry.expense.expenseDate), 'MMM d, yyyy')} ·{' '}
                            {entry.expenseGroupLabel}
                          </Text>
                          <Text style={styles.expenseMeta}>
                            Paid by {payerName} · {formatExpenseSplitSummary(entry.expense)}
                          </Text>
                          {isManager && !entry.viewerInvolved ? (
                            <Text style={styles.notInvolved}>Not involved</Text>
                          ) : null}
                        </View>
                        <Text style={styles.expenseAmount}>
                          {formatExpenseMoney(
                            entry.expense.amountCents,
                            entry.expenseGroup.currency
                          )}
                        </Text>
                      </View>

                      <View style={styles.debtorList}>
                        {entry.debtors.map((debtor) => {
                          const debtorName = memberNameById.get(debtor.userId) ?? 'Member';
                          const isYou = debtor.userId === viewerUserId;
                          const canSettle = isYou || isManager;
                          const amountLabel = formatExpenseMoney(
                            debtor.remainingCents,
                            entry.expenseGroup.currency
                          );
                          const confirmingDebtor =
                            isConfirmingThis && pendingSettle?.debtorUserId === debtor.userId;

                          return (
                            <View key={debtor.userId} style={styles.debtorRow}>
                              <Text style={styles.debtorText}>
                                {debtorName}
                                {isYou ? ' (you)' : ''} owes {amountLabel}
                              </Text>
                              {canSettle && !confirmingDebtor ? (
                                <Button
                                  title="Settle"
                                  variant="money"
                                  size="sm"
                                  onPress={() => {
                                    setSettleError(null);
                                    setPendingSettle({
                                      entryKey: key,
                                      debtorUserId: debtor.userId,
                                      remainingCents: debtor.remainingCents,
                                    });
                                  }}
                                  style={styles.settleButton}
                                />
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </Card>

                    {isConfirmingThis && pendingSettle && pendingEntry ? (
                      <InlineConfirmPanel
                        title="Settle up?"
                        message={`Record that ${
                          memberNameById.get(pendingSettle.debtorUserId) ?? 'Member'
                        } paid ${payerName} ${formatExpenseMoney(
                          pendingSettle.remainingCents,
                          pendingEntry.expenseGroup.currency
                        )} for "${pendingEntry.expense.description}"?`}
                        confirmLabel="Yes"
                        confirmVariant="money"
                        elevated
                        loading={settling}
                        error={settleError}
                        onConfirm={confirmSettle}
                        onCancel={() => {
                          setPendingSettle(null);
                          setSettleError(null);
                        }}
                      />
                    ) : null}
                  </View>
                );
              })
            : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.caption,
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    gap: 4,
    marginBottom: spacing.md,
  },
  section: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  sectionHasItems: {
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: colors.surface,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.warning,
  },
  cardWrap: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  expenseCard: {
    marginBottom: 0,
  },
  expenseTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  expenseContent: {
    flex: 1,
    gap: 2,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  expenseMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  notInvolved: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  debtorList: {
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  debtorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  settleButton: {
    flexShrink: 0,
  },
});
