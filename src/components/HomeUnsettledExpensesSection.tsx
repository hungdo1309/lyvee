import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, startOfDay } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from './Card';
import { Button } from './Button';
import { SettleConfirmPanel } from './SettleConfirmPanel';
import { ExpensesIcon } from './ExpensesIcon';
import { addSettlement } from '../services/expenseGroups';
import { formatExpenseMoney } from '../utils/expenseMoney';
import { allocateSettlementToExpenses } from '../utils/expenseSplits';
import {
  allocatePersonSettlement,
  homePersonDebtEntryKey,
  HomePersonDebtEntry,
} from '../utils/homeSettleExpenses';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { Expense, ExpenseSettlement } from '../types/expenses';

interface HomeUnsettledExpensesSectionProps {
  entries: HomePersonDebtEntry[];
  memberNameById: Map<string, string>;
  viewerUserId: string;
  expensesByGroupId: Map<string, Expense[]>;
  settlementsByGroupId: Map<string, ExpenseSettlement[]>;
  onSettled?: (expenseGroupIds: string[]) => void;
}

export function HomeUnsettledExpensesSection({
  entries,
  memberNameById,
  viewerUserId,
  expensesByGroupId,
  settlementsByGroupId,
  onSettled,
}: HomeUnsettledExpensesSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [pendingEntryKey, setPendingEntryKey] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const pendingEntry = useMemo(() => {
    if (!pendingEntryKey) return null;
    return entries.find((entry) => homePersonDebtEntryKey(entry) === pendingEntryKey) ?? null;
  }, [entries, pendingEntryKey]);

  if (entries.length === 0) return null;

  const confirmSettle = async (amountCents: number) => {
    if (!pendingEntry) return;

    setSettling(true);
    setSettleError(null);
    try {
      const groupAllocations = allocatePersonSettlement(pendingEntry, amountCents);
      const settlementDate = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const touchedIds: string[] = [];

      // Track settlements written in this confirm so later group chunks / expenses see them.
      const workingSettlements = new Map<string, ExpenseSettlement[]>();
      for (const [groupId, list] of settlementsByGroupId) {
        workingSettlements.set(groupId, [...list]);
      }

      for (const groupAllocation of groupAllocations) {
        const expenseGroup = groupAllocation.expenseGroup;
        const expenses = expensesByGroupId.get(expenseGroup.id) ?? [];
        const groupSettlements = workingSettlements.get(expenseGroup.id) ?? [];

        const expenseAllocations = allocateSettlementToExpenses(
          expenses,
          expenseGroup.memberIds,
          groupSettlements,
          viewerUserId,
          pendingEntry.toUserId,
          groupAllocation.amountCents
        );

        if (expenseAllocations.length === 0) {
          throw new Error('No open expenses found for this payment');
        }

        for (const expenseAllocation of expenseAllocations) {
          await addSettlement(
            expenseGroup,
            {
              expenseId: expenseAllocation.expenseId,
              fromUserId: viewerUserId,
              toUserId: pendingEntry.toUserId,
              amountCents: expenseAllocation.amountCents,
              settlementDate,
            },
            viewerUserId
          );
          groupSettlements.push({
            id: 'pending',
            expenseGroupId: expenseGroup.id,
            expenseId: expenseAllocation.expenseId,
            fromUserId: viewerUserId,
            toUserId: pendingEntry.toUserId,
            amountCents: expenseAllocation.amountCents,
            settlementDate,
            createdBy: viewerUserId,
            createdAt: settlementDate,
            updatedAt: settlementDate,
          });
        }

        workingSettlements.set(expenseGroup.id, groupSettlements);
        touchedIds.push(expenseGroup.id);
      }

      setPendingEntryKey(null);
      onSettled?.(touchedIds);
    } catch (error) {
      setSettleError(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  };

  const peopleLabel =
    entries.length === 1 ? '1 person to settle' : `${entries.length} people to settle`;

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
              <Text style={styles.sectionHeaderText}>{peopleLabel}</Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.warning}
            />
          </TouchableOpacity>

          {expanded
            ? entries.map((entry) => {
                const key = homePersonDebtEntryKey(entry);
                const toName = memberNameById.get(entry.toUserId) ?? 'Member';
                const amountLabel = formatExpenseMoney(entry.totalCents, entry.currency);
                const breakdown = entry.parts
                  .map((part) => part.expenseGroupLabel)
                  .filter((label, index, all) => all.indexOf(label) === index)
                  .join(' · ');
                const isConfirmingThis = pendingEntryKey === key;

                return (
                  <View key={key} style={styles.cardWrap}>
                    <Card style={styles.personCard}>
                      <View style={styles.personTopRow}>
                        <View style={styles.personContent}>
                          <Text style={styles.personTitle}>You owe {toName}</Text>
                          {breakdown ? (
                            <Text style={styles.personMeta}>{breakdown}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.personAmount}>{amountLabel}</Text>
                      </View>

                      {!isConfirmingThis ? (
                        <View style={styles.settleRow}>
                          <Button
                            title="Settle"
                            variant="money"
                            size="sm"
                            onPress={() => {
                              setSettleError(null);
                              setPendingEntryKey(key);
                            }}
                            style={styles.settleButton}
                          />
                        </View>
                      ) : null}
                    </Card>

                    {isConfirmingThis && pendingEntry ? (
                      <SettleConfirmPanel
                        title="Settle up?"
                        message={`Record a payment to ${toName}.`}
                        currency={pendingEntry.currency}
                        maxAmountCents={pendingEntry.totalCents}
                        partialHint="Partial payments apply to your oldest unsettled expenses first."
                        confirmLabel="Record payment"
                        elevated
                        loading={settling}
                        error={settleError}
                        onConfirm={confirmSettle}
                        onCancel={() => {
                          setPendingEntryKey(null);
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
    ...typography.sectionTitle,
    marginBottom: 0,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.xxs,
    marginBottom: spacing.md,
  },
  section: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sectionHasItems: {
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdTight,
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
  personCard: {
    marginBottom: 0,
  },
  personTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  personContent: {
    flex: 1,
    gap: 2,
  },
  personTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  personMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  personAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  settleButton: {
    flexShrink: 0,
  },
});
