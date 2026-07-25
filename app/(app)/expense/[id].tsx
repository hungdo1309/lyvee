import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { format, parseISO, startOfDay } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { appAlert } from '../../../src/utils/dialog';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { ItemFormScreen } from '../../../src/components/ItemFormScreen';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import { HeaderDeleteButton } from '../../../src/components/HeaderDeleteButton';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { EmptyState } from '../../../src/components/EmptyState';
import { Fab } from '../../../src/components/Fab';
import { Card } from '../../../src/components/Card';
import { ExpenseEditor } from '../../../src/components/ExpenseEditor';
import {
  EXPENSES_EMPTY_ICON_WRAP_SIZE,
  EXPENSES_ICON_SIZE,
  ExpensesIcon,
} from '../../../src/components/ExpensesIcon';
import { GROUP_EXPENSE_NAME } from '../../../src/types/expenses';
import {
  addExpense,
  addSettlement,
  deleteExpense,
  deleteExpenseGroup,
  deleteSettlement,
  subscribeToExpenseGroup,
  subscribeToExpenseGroupExpenses,
  subscribeToExpenseGroupSettlements,
  updateExpense,
} from '../../../src/services/expenseGroups';
import { subscribeToTrip } from '../../../src/services/trips';
import { useGroupMembers, EMPTY_MEMBER_IDS } from '../../../src/hooks/useGroupMembers';
import { useExpenseBalances } from '../../../src/hooks/useExpenseBalances';
import { Expense, ExpenseGroup, ExpenseSettlement } from '../../../src/types/expenses';
import { Trip } from '../../../src/types/trips';
import { formatExpenseMoney } from '../../../src/utils/expenseMoney';
import { formatExpenseSplitSummary, findLinkedSettlementsForUserExpense, getUserExpenseShareCents, getUserExpenseShareRemainingCents, isExpenseFullySettled, isExpenseSettledByUser, isUserInvolvedInExpense, partitionExpensesBySettlementStatus, computeExpensePortionsCents } from '../../../src/utils/expenseSplits';
import { canManageGroup } from '../../../src/utils/groupRoles';
import {
  canDeleteExpenseGroup,
  canEditExpenseGroup,
  canViewExpenseGroup,
} from '../../../src/utils/expensePermissions';
import { colors, layout, radius, spacing, typography } from '../../../src/constants/theme';

export default function ExpenseGroupDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { user } = useAuth();
  const { groups } = useApp();
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<ExpenseSettlement[]>([]);
  const [linkedTrip, setLinkedTrip] = useState<Trip | null>(null);
  const [linkedTripReady, setLinkedTripReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editorReadOnly, setEditorReadOnly] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settledSectionExpanded, setSettledSectionExpanded] = useState(false);

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
  const canEdit =
    expenseGroup && user ? canEditExpenseGroup(expenseGroup, group, user.id, linkedTrip) : false;
  const canDelete =
    expenseGroup && user ? canDeleteExpenseGroup(expenseGroup, group, user.id, linkedTrip) : false;
  const isGroupManager = Boolean(group && user && canManageGroup(group, user.id));

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of groupMembers) {
      map.set(member.id, member.name);
    }
    return map;
  }, [groupMembers]);

  const { balances } = useExpenseBalances(expenseGroup, expenses, settlements);

  const yourBalance = useMemo(() => {
    if (!user) return 0;
    return balances.find((entry) => entry.userId === user.id)?.netCents ?? 0;
  }, [balances, user]);

  const visibleExpenses = useMemo(() => {
    if (!expenseGroup || !user) return [];
    if (isGroupManager) return expenses;
    return expenses.filter((expense) =>
      isUserInvolvedInExpense(expense, user.id, expenseGroup.memberIds)
    );
  }, [expenseGroup, expenses, isGroupManager, user]);

  const { openExpenses, settledExpenses } = useMemo(() => {
    if (!expenseGroup) {
      return { openExpenses: [] as Expense[], settledExpenses: [] as Expense[] };
    }

    return partitionExpensesBySettlementStatus(
      visibleExpenses,
      expenseGroup.memberIds,
      settlements
    );
  }, [expenseGroup, visibleExpenses, settlements]);

  const backLabel =
    from === 'trip' ? 'Back to trip' : from === 'expenses' ? 'Back to Expenses' : 'Back';

  const handleDeleteGroup = () => {
    if (!expenseGroup || !user) return;
    const tripTitle = linkedTrip?.destination ?? expenseGroup.name;
    const title = expenseGroup.tripId ? 'Delete trip expenses?' : 'Delete this expense group?';
    const message = expenseGroup.tripId
      ? `Deleting "${tripTitle}" will permanently remove all ${expenses.length} expense${
          expenses.length === 1 ? '' : 's'
        } and their balances. This cannot be undone.`
      : `"${
          expenseGroup.isDefault ? GROUP_EXPENSE_NAME : expenseGroup.name
        }" and all its expenses will be permanently removed.`;
    appAlert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpenseGroup(expenseGroup, user.id);
              router.back();
            } catch (error) {
              appAlert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete expense group'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteExpense = (expense: Expense) => {
    if (!expenseGroup || !user) return;
    appAlert('Delete expense?', `"${expense.description}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteExpense(expenseGroup, expense.id, user.id),
      },
    ]);
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setEditorReadOnly(false);
    setEditorVisible(true);
  };

  const openViewExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditorReadOnly(true);
    setEditorVisible(true);
  };

  const openEditExpense = (expense: Expense) => {
    if (!canEdit) return;
    setEditingExpense(expense);
    setEditorReadOnly(false);
    setEditorVisible(true);
  };

  const closeExpenseEditor = () => {
    setEditorVisible(false);
    setEditingExpense(null);
    setEditorReadOnly(false);
  };

  const viewingExpenseShareCents =
    editingExpense && user && expenseGroup
      ? getUserExpenseShareCents(editingExpense, user.id, expenseGroup.memberIds)
      : null;

  const viewingExpenseRemainingCents =
    editingExpense && user && expenseGroup
      ? getUserExpenseShareRemainingCents(
          editingExpense,
          user.id,
          expenseGroup.memberIds,
          expenses,
          settlements
        )
      : null;

  const viewingExpenseSettled =
    editingExpense && user && expenseGroup
      ? isExpenseSettledByUser(
          editingExpense,
          user.id,
          expenseGroup.memberIds,
          expenses,
          settlements
        )
      : false;

  const handleSettleExpense = async (amountCents: number) => {
    if (
      !expenseGroup ||
      !user ||
      !editingExpense ||
      viewingExpenseRemainingCents == null ||
      viewingExpenseRemainingCents <= 0
    ) {
      throw new Error('Could not record payment');
    }

    await addSettlement(
      expenseGroup,
      {
        expenseId: editingExpense.id,
        fromUserId: user.id,
        toUserId: editingExpense.paidByUserId,
        amountCents,
        settlementDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      },
      user.id
    );
  };

  const viewingExpenseLinkedSettlements =
    editingExpense && user
      ? findLinkedSettlementsForUserExpense(editingExpense, user.id, settlements)
      : [];

  const viewingExpenseMemberSettleDebtors = useMemo(() => {
    if (!editingExpense || !expenseGroup || !user || !isGroupManager) return [];

    const debtors: Array<{ userId: string; name: string; remainingCents: number }> = [];
    const portions = computeExpensePortionsCents(editingExpense, expenseGroup.memberIds);

    for (const [debtorUserId, portionCents] of portions) {
      if (debtorUserId === editingExpense.paidByUserId || portionCents <= 0) continue;
      if (debtorUserId === user.id) continue;

      const remainingCents = getUserExpenseShareRemainingCents(
        editingExpense,
        debtorUserId,
        expenseGroup.memberIds,
        expenses,
        settlements
      );

      if (remainingCents <= 0) continue;

      debtors.push({
        userId: debtorUserId,
        name: memberNameById.get(debtorUserId) ?? 'Member',
        remainingCents,
      });
    }

    return debtors;
  }, [editingExpense, expenseGroup, user, isGroupManager, expenses, settlements, memberNameById]);

  const viewingExpenseMemberUnsettleTargets = useMemo(() => {
    if (!editingExpense || !expenseGroup || !user || !isGroupManager) return [];

    const targets: Array<{ userId: string; name: string }> = [];
    const portions = computeExpensePortionsCents(editingExpense, expenseGroup.memberIds);

    for (const [debtorUserId, portionCents] of portions) {
      if (debtorUserId === editingExpense.paidByUserId || portionCents <= 0) continue;
      if (debtorUserId === user.id) continue;

      const settled = isExpenseSettledByUser(
        editingExpense,
        debtorUserId,
        expenseGroup.memberIds,
        expenses,
        settlements
      );
      const linkedSettlements = findLinkedSettlementsForUserExpense(
        editingExpense,
        debtorUserId,
        settlements
      );

      if (!settled || linkedSettlements.length === 0) continue;

      targets.push({
        userId: debtorUserId,
        name: memberNameById.get(debtorUserId) ?? 'Member',
      });
    }

    return targets;
  }, [editingExpense, expenseGroup, user, isGroupManager, expenses, settlements, memberNameById]);

  const handleSettleForMember = async (memberUserId: string, amountCents: number) => {
    if (!expenseGroup || !user || !editingExpense) {
      throw new Error('Could not record payment');
    }

    await addSettlement(
      expenseGroup,
      {
        expenseId: editingExpense.id,
        fromUserId: memberUserId,
        toUserId: editingExpense.paidByUserId,
        amountCents,
        settlementDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      },
      user.id
    );
  };

  const handleUnsettleForMember = async (memberUserId: string) => {
    if (!expenseGroup || !user || !editingExpense) {
      throw new Error('Could not remove payment');
    }

    const linkedSettlements = findLinkedSettlementsForUserExpense(
      editingExpense,
      memberUserId,
      settlements
    );

    if (linkedSettlements.length === 0) {
      throw new Error('No expense-linked payment found to remove for this member');
    }

    for (const settlement of linkedSettlements) {
      await deleteSettlement(expenseGroup, settlement.id, user.id);
    }
  };

  const viewingExpenseInvolved =
    editingExpense && user && expenseGroup
      ? isUserInvolvedInExpense(editingExpense, user.id, expenseGroup.memberIds)
      : false;

  const handleUnsettleExpense = async () => {
    if (!expenseGroup || !user || !editingExpense) {
      throw new Error('Could not remove payment');
    }

    const linkedSettlements = findLinkedSettlementsForUserExpense(
      editingExpense,
      user.id,
      settlements
    );

    if (linkedSettlements.length === 0) {
      throw new Error('No expense-linked payment found to remove');
    }

    for (const settlement of linkedSettlements) {
      await deleteSettlement(expenseGroup, settlement.id, user.id);
    }
  };

  const renderExpenseCard = (expense: Expense) => {
    const fullySettled =
      expenseGroup != null &&
      isExpenseFullySettled(expense, expenseGroup.memberIds, expenses, settlements);
    const notInvolved =
      isGroupManager &&
      user != null &&
      expenseGroup != null &&
      !isUserInvolvedInExpense(expense, user.id, expenseGroup.memberIds);

    return (
      <Card
        key={expense.id}
        style={styles.expenseCard}
        onPress={() => openViewExpense(expense)}
        accessibilityRole="button"
        accessibilityLabel={`View ${expense.description}`}
      >
        <View style={styles.expenseTopRow}>
          <View style={styles.expenseContent}>
            <Text style={styles.expenseTitle}>{expense.description}</Text>
            <Text style={styles.expenseMeta}>
              {format(parseISO(expense.expenseDate), 'MMM d, yyyy')} · Paid by{' '}
              {memberNameById.get(expense.paidByUserId) ?? 'Member'}
            </Text>
            <Text style={styles.expenseSplit}>{formatExpenseSplitSummary(expense)}</Text>
            {notInvolved ? <Text style={styles.notInvolved}>Not involved</Text> : null}
          </View>
          <View style={styles.expenseRight}>
            {fullySettled ? (
              <Text style={styles.expenseSettled}>Settled</Text>
            ) : (
              <Text style={styles.expenseAmount}>
                {formatExpenseMoney(expense.amountCents, expenseGroup!.currency)}
              </Text>
            )}
            {canEdit ? (
              <TouchableOpacity
                onPress={() => handleDeleteExpense(expense)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete expense"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Card>
    );
  };

  if (loading || (expenseGroup?.tripId && !linkedTripReady)) {
    return <LoadingScreen />;
  }

  if (!expenseGroup || !canView) {
    return (
      <ItemFormScreen
        title="Expenses"
        leftAction={
          <ScreenBackButton label="Back" showChevron onPress={() => router.back()} />
        }
      >
        <EmptyState
          iconNode={<ExpensesIcon size={EXPENSES_ICON_SIZE.emptyLarge} />}
          title="Expense group not found"
          subtitle="This expense group may have been deleted or you do not have access."
          compact
          iconWrapSize={EXPENSES_EMPTY_ICON_WRAP_SIZE}
        />
      </ItemFormScreen>
    );
  }

  const displayTitle = expenseGroup.isDefault
    ? GROUP_EXPENSE_NAME
    : linkedTrip
      ? linkedTrip.destination
      : expenseGroup.name;

  return (
    <>
      <View style={styles.screen}>
        <ItemFormScreen
          title=""
          leftAction={
            <ScreenBackButton
              label={backLabel}
              showChevron
              onPress={() => router.back()}
              style={styles.headerBackButton}
            />
          }
          rightAction={
            canDelete ? <HeaderDeleteButton onPress={handleDeleteGroup} loading={deleting} /> : undefined
          }
        >
          <View style={styles.scrollContent}>
          <View style={styles.hero}>
            <Text style={styles.title}>{displayTitle}</Text>
            {linkedTrip ? (
              <TouchableOpacity
                onPress={() => router.push(`/(app)/trip/${linkedTrip.id}` as Href)}
                style={styles.linkedTripButton}
              >
                <Ionicons name="airplane-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.linkedTripText}>{linkedTrip.destination}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.meta}>
              {expenseGroup.memberIds.length}{' '}
              {expenseGroup.memberIds.length === 1 ? 'member' : 'members'}
            </Text>
          </View>

          <Card
            style={styles.balanceCard}
            onPress={() =>
              router.push(
                (from
                  ? `/(app)/expense/balances/${expenseGroup.id}?from=${from}`
                  : `/(app)/expense/balances/${expenseGroup.id}`) as Href
              )
            }
            accessibilityRole="button"
            accessibilityLabel="View expense balances"
          >
            <View style={styles.balanceCardRow}>
              <View style={styles.balanceCardContent}>
                <Text style={styles.balanceLabel}>Your balance</Text>
                <Text
                  style={[
                    styles.balanceValue,
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
              </View>
              <View style={styles.balanceCardAction}>
                <Text style={styles.viewBalancesText}>View Balances</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Expenses</Text>
            {expenses.length === 0 ? (
              <Text style={styles.emptyExpenses}>No expenses yet. Tap + to add one.</Text>
            ) : visibleExpenses.length === 0 ? (
              <Text style={styles.emptyExpenses}>No expenses you are involved with yet.</Text>
            ) : (
              <>
                {openExpenses.map(renderExpenseCard)}

                {settledExpenses.length > 0 ? (
                  <View style={styles.settledSection}>
                    <TouchableOpacity
                      style={styles.settledHeader}
                      onPress={() => setSettledSectionExpanded((expanded) => !expanded)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: settledSectionExpanded }}
                    >
                      <Text style={styles.settledHeaderText}>
                        Settled ({settledExpenses.length})
                      </Text>
                      <Ionicons
                        name={settledSectionExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {settledSectionExpanded ? settledExpenses.map(renderExpenseCard) : null}
                  </View>
                ) : null}
              </>
            )}
          </View>
          </View>
        </ItemFormScreen>

        {canEdit ? <Fab onPress={openAddExpense} accessibilityLabel="Add expense" /> : null}
      </View>

      <ExpenseEditor
        visible={editorVisible}
        expenseGroup={expenseGroup}
        members={groupMembers}
        initialExpense={editingExpense}
        readOnly={editorReadOnly}
        onEdit={
          canEdit && editingExpense
            ? () => openEditExpense(editingExpense)
            : undefined
        }
        onSettle={
          editorReadOnly &&
          viewingExpenseShareCents != null &&
          viewingExpenseRemainingCents != null &&
          viewingExpenseRemainingCents > 0 &&
          !viewingExpenseSettled
            ? handleSettleExpense
            : undefined
        }
        onUnsettle={
          editorReadOnly &&
          viewingExpenseShareCents != null &&
          viewingExpenseSettled &&
          viewingExpenseLinkedSettlements.length > 0
            ? handleUnsettleExpense
            : undefined
        }
        onSettleForMember={
          editorReadOnly && isGroupManager ? handleSettleForMember : undefined
        }
        onUnsettleForMember={
          editorReadOnly && isGroupManager ? handleUnsettleForMember : undefined
        }
        memberSettleDebtors={
          editorReadOnly && isGroupManager ? viewingExpenseMemberSettleDebtors : []
        }
        memberUnsettleTargets={
          editorReadOnly && isGroupManager ? viewingExpenseMemberUnsettleTargets : []
        }
        showNotInvolved={editorReadOnly && isGroupManager && !viewingExpenseInvolved}
        yourShareCents={editorReadOnly ? viewingExpenseShareCents : null}
        settleAmountCents={
          editorReadOnly && viewingExpenseRemainingCents != null && viewingExpenseRemainingCents > 0
            ? viewingExpenseRemainingCents
            : null
        }
        expenseSettled={editorReadOnly ? viewingExpenseSettled : false}
        onClose={closeExpenseEditor}
        onSave={async (values) => {
          if (!user) return;
          if (editingExpense) {
            await updateExpense(expenseGroup, editingExpense.id, values, user.id);
          } else {
            await addExpense(expenseGroup, values, user.id);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBackButton: {
    marginBottom: 0,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.xl,
  },
  hero: {
    gap: 4,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 28,
    color: colors.primaryDark,
  },
  linkedTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  linkedTripText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  meta: {
    ...typography.caption,
  },
  balanceCard: {
    marginBottom: spacing.lg,
  },
  balanceCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceCardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  balanceCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'center',
  },
  viewBalancesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  balanceLabel: {
    ...typography.sectionTitle,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  balancePositive: {
    color: colors.success,
  },
  balanceNegative: {
    color: colors.error,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.heading,
    fontSize: 18,
  },
  emptyExpenses: {
    fontSize: 14,
    color: colors.textMuted,
  },
  expenseCard: {
    marginBottom: spacing.sm,
  },
  expenseTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  expenseSplit: {
    fontSize: 12,
    color: colors.textMuted,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  expenseSettled: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  notInvolved: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  settledSection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  settledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  settledHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
