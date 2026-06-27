import { Group } from '../types';
import { Expense, ExpenseGroup, ExpenseSettlement, GROUP_EXPENSE_NAME } from '../types/expenses';
import { Trip } from '../types/trips';
import { canManageGroup } from './groupRoles';
import { getTripTitleForExpenseGroup } from './expenses';
import {
  compareExpensesEarliest,
  computeOpenExpenseDebtSlices,
  isUserInvolvedInExpense,
} from './expenseSplits';

export interface HomeSettleExpenseDebtor {
  userId: string;
  remainingCents: number;
}

export interface HomeSettleExpenseEntry {
  expense: Expense;
  expenseGroup: ExpenseGroup;
  expenseGroupLabel: string;
  viewerInvolved: boolean;
  debtors: HomeSettleExpenseDebtor[];
}

export function getExpenseGroupLabel(
  expenseGroup: ExpenseGroup,
  trips: Trip[]
): string {
  if (expenseGroup.isDefault) return GROUP_EXPENSE_NAME;
  if (expenseGroup.tripId) return getTripTitleForExpenseGroup(expenseGroup, trips);
  return expenseGroup.name;
}

export function buildHomeSettleExpenseEntries(
  group: Group,
  userId: string,
  visibleExpenseGroups: ExpenseGroup[],
  expensesByGroupId: Map<string, Expense[]>,
  settlementsByGroupId: Map<string, ExpenseSettlement[]>,
  trips: Trip[]
): HomeSettleExpenseEntry[] {
  const isManager = canManageGroup(group, userId);
  const entries: HomeSettleExpenseEntry[] = [];

  for (const expenseGroup of visibleExpenseGroups) {
    const expenses = expensesByGroupId.get(expenseGroup.id) ?? [];
    const settlements = settlementsByGroupId.get(expenseGroup.id) ?? [];
    if (expenses.length === 0) continue;

    const label = getExpenseGroupLabel(expenseGroup, trips);
    const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));
    const openSlices = computeOpenExpenseDebtSlices(
      expenses,
      expenseGroup.memberIds,
      settlements
    );

    const debtorsByExpenseId = new Map<string, HomeSettleExpenseDebtor[]>();

    for (const slice of openSlices) {
      if (!isManager && slice.debtorUserId !== userId) continue;

      const debtors = debtorsByExpenseId.get(slice.expenseId) ?? [];
      debtors.push({
        userId: slice.debtorUserId,
        remainingCents: slice.remainingCents,
      });
      debtorsByExpenseId.set(slice.expenseId, debtors);
    }

    for (const [expenseId, debtors] of debtorsByExpenseId) {
      const expense = expenseById.get(expenseId);
      if (!expense || debtors.length === 0) continue;

      const viewerInvolved = isUserInvolvedInExpense(expense, userId, expenseGroup.memberIds);
      if (!isManager && !viewerInvolved) continue;

      entries.push({
        expense,
        expenseGroup,
        expenseGroupLabel: label,
        viewerInvolved,
        debtors,
      });
    }
  }

  return entries.sort((left, right) => compareExpensesEarliest(left.expense, right.expense));
}
