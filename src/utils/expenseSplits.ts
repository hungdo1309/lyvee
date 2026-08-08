import {
  Expense,
  ExpenseInput,
  ExpenseSettlement,
  ExpenseSplitMode,
  PERCENTAGE_SCALE,
} from '../types/expenses';
import { parseExpenseAmountToCents } from './expenseMoney';

export const EXPENSE_SPLIT_MODES: ExpenseSplitMode[] = ['equal', 'exact', 'percentage', 'shares'];

export const EXPENSE_SPLIT_MODE_LABELS: Record<ExpenseSplitMode, string> = {
  equal: 'Equal',
  exact: 'Exact',
  percentage: '%',
  shares: 'Shares',
};

function allocateCentsByWeights(totalCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return weights.map(() => 0);
  }

  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return totalCents - allocated;
    }
    const portion = Math.round((totalCents * weight) / totalWeight);
    allocated += portion;
    return portion;
  });
}

function allocateEqualCents(totalCents: number, participantCount: number): number[] {
  if (participantCount <= 0) return [];
  const share = Math.round(totalCents / participantCount);
  let allocated = 0;
  return Array.from({ length: participantCount }, (_, index) => {
    if (index === participantCount - 1) {
      return totalCents - allocated;
    }
    allocated += share;
    return share;
  });
}

export function getExpenseParticipants(
  expense: Pick<Expense, 'splitAmongUserIds'>,
  groupMemberIds: string[]
): string[] {
  return expense.splitAmongUserIds.length > 0
    ? expense.splitAmongUserIds.filter((id) => groupMemberIds.includes(id))
    : groupMemberIds;
}

export function computeExpensePortionsCents(
  expense: Pick<Expense, 'amountCents' | 'splitAmongUserIds' | 'splitMode' | 'splitValues'>,
  groupMemberIds: string[]
): Map<string, number> {
  const participants = getExpenseParticipants(expense, groupMemberIds);
  const portions = new Map<string, number>();
  if (participants.length === 0) return portions;

  const mode = expense.splitMode ?? 'equal';
  const splitValues = expense.splitValues ?? {};

  if (mode === 'equal') {
    const shares = allocateEqualCents(expense.amountCents, participants.length);
    participants.forEach((userId, index) => {
      portions.set(userId, shares[index] ?? 0);
    });
    return portions;
  }

  if (mode === 'exact') {
    for (const userId of participants) {
      portions.set(userId, splitValues[userId] ?? 0);
    }
    return portions;
  }

  const weights = participants.map((userId) => {
    const value = splitValues[userId] ?? 0;
    return mode === 'shares' ? Math.max(value, 0) : value;
  });
  const shares = allocateCentsByWeights(expense.amountCents, weights);
  participants.forEach((userId, index) => {
    portions.set(userId, shares[index] ?? 0);
  });
  return portions;
}

export function parsePercentageInput(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '');
  if (!normalized) return null;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0').slice(0, 2);
  if (!Number.isFinite(whole)) return null;
  const basisPoints = whole * 100 + Number(fraction);
  if (basisPoints < 0 || basisPoints > PERCENTAGE_SCALE) return null;
  return basisPoints;
}

export function formatPercentageInput(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2);
}

export function buildDefaultSplitValues(
  mode: ExpenseSplitMode,
  participantIds: string[],
  amountCents: number
): Record<string, number> {
  if (participantIds.length === 0) return {};

  if (mode === 'equal') {
    return {};
  }

  if (mode === 'exact') {
    const shares = allocateEqualCents(amountCents, participantIds.length);
    return Object.fromEntries(participantIds.map((userId, index) => [userId, shares[index] ?? 0]));
  }

  if (mode === 'percentage') {
    const base = Math.floor(PERCENTAGE_SCALE / participantIds.length);
    let allocated = 0;
    return Object.fromEntries(
      participantIds.map((userId, index) => {
        if (index === participantIds.length - 1) {
          return [userId, PERCENTAGE_SCALE - allocated];
        }
        allocated += base;
        return [userId, base];
      })
    );
  }

  return Object.fromEntries(participantIds.map((userId) => [userId, 1]));
}

export function validateExpenseSplit(
  input: Pick<ExpenseInput, 'amountCents' | 'splitAmongUserIds' | 'splitMode' | 'splitValues'>,
  memberIds: string[]
): { splitMode: ExpenseSplitMode; splitValues?: Record<string, number> } {
  const participants =
    input.splitAmongUserIds.length > 0
      ? input.splitAmongUserIds.filter((id) => memberIds.includes(id))
      : memberIds;

  if (participants.length === 0) {
    throw new Error('Choose at least one person to split with');
  }

  const splitMode = input.splitMode ?? 'equal';
  const splitValues = input.splitValues ?? {};

  if (splitMode === 'equal') {
    return { splitMode: 'equal' };
  }

  if (splitMode === 'exact') {
    let total = 0;
    for (const userId of participants) {
      const value = splitValues[userId];
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Enter a valid amount for each person');
      }
      total += value;
    }
    if (total !== input.amountCents) {
      throw new Error('Exact split amounts must add up to the expense total');
    }
    return {
      splitMode: 'exact',
      splitValues: Object.fromEntries(participants.map((userId) => [userId, splitValues[userId] ?? 0])),
    };
  }

  if (splitMode === 'percentage') {
    let total = 0;
    for (const userId of participants) {
      const value = splitValues[userId];
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Enter a valid percentage for each person');
      }
      total += value;
    }
    if (total !== PERCENTAGE_SCALE) {
      throw new Error('Split percentages must add up to 100%');
    }
    return {
      splitMode: 'percentage',
      splitValues: Object.fromEntries(participants.map((userId) => [userId, splitValues[userId] ?? 0])),
    };
  }

  if (splitMode === 'shares') {
    for (const userId of participants) {
      const value = splitValues[userId];
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('Each person needs at least 1 share');
      }
    }
    return {
      splitMode: 'shares',
      splitValues: Object.fromEntries(participants.map((userId) => [userId, splitValues[userId] ?? 1])),
    };
  }

  return { splitMode: 'equal' };
}

export function formatExpenseSplitSummary(
  expense: Pick<Expense, 'splitAmongUserIds' | 'splitMode'>
): string {
  const count = expense.splitAmongUserIds.length;
  const mode = expense.splitMode ?? 'equal';

  switch (mode) {
    case 'exact':
      return 'Split by exact amount';
    case 'percentage':
      return 'Split by percentage';
    case 'shares':
      return 'Split by shares';
    default:
      return `Split ${count} ${count === 1 ? 'way' : 'ways'}`;
  }
}

/** Sort expenses with the earliest date first. */
export function compareExpensesEarliest(left: Expense, right: Expense): number {
  const dateCompare = left.expenseDate.localeCompare(right.expenseDate);
  if (dateCompare !== 0) return dateCompare;
  return left.createdAt.localeCompare(right.createdAt);
}

/** Sort expenses with the latest date first. */
export function compareExpensesLatestFirst(left: Expense, right: Expense): number {
  return -compareExpensesEarliest(left, right);
}

/** Sort expenses with the earliest updatedAt first. */
export function compareExpensesByUpdatedAtEarliest(left: Expense, right: Expense): number {
  const updatedCompare = left.updatedAt.localeCompare(right.updatedAt);
  if (updatedCompare !== 0) return updatedCompare;
  return left.createdAt.localeCompare(right.createdAt);
}

export function isUserInvolvedInExpense(
  expense: Expense,
  userId: string,
  groupMemberIds: string[]
): boolean {
  if (expense.paidByUserId === userId) return true;

  const participants =
    expense.splitAmongUserIds.length > 0
      ? expense.splitAmongUserIds
      : groupMemberIds;

  return participants.includes(userId);
}

type ExpenseSettlementRef = Pick<
  ExpenseSettlement,
  'expenseId' | 'fromUserId' | 'toUserId' | 'amountCents'
>;

interface ExpenseDebtSlice {
  expenseId: string;
  debtorUserId: string;
  payerUserId: string;
  remainingCents: number;
}

function buildExpenseDebtSlices(expenses: Expense[], groupMemberIds: string[]): ExpenseDebtSlice[] {
  const slices: ExpenseDebtSlice[] = [];
  const sortedExpenses = [...expenses].sort(compareExpensesEarliest);

  for (const expense of sortedExpenses) {
    const portions = computeExpensePortionsCents(expense, groupMemberIds);
    for (const [debtorUserId, portionCents] of portions) {
      if (debtorUserId === expense.paidByUserId || portionCents <= 0) continue;
      slices.push({
        expenseId: expense.id,
        debtorUserId,
        payerUserId: expense.paidByUserId,
        remainingCents: portionCents,
      });
    }
  }

  return slices;
}

function applySettlementToSlices(
  slices: ExpenseDebtSlice[],
  settlement: ExpenseSettlementRef
): void {
  let amountLeft = settlement.amountCents;

  for (const slice of slices) {
    if (amountLeft <= 0) break;
    if (slice.debtorUserId !== settlement.fromUserId) continue;
    if (slice.payerUserId !== settlement.toUserId) continue;
    if (slice.remainingCents <= 0) continue;
    if (settlement.expenseId && slice.expenseId !== settlement.expenseId) continue;

    const applied = Math.min(slice.remainingCents, amountLeft);
    slice.remainingCents -= applied;
    amountLeft -= applied;

    if (settlement.expenseId) break;
  }
}

function applyAllSettlementsToSlices(
  slices: ExpenseDebtSlice[],
  settlements: ExpenseSettlementRef[]
): void {
  for (const settlement of settlements) {
    if (settlement.expenseId) {
      applySettlementToSlices(slices, settlement);
    }
  }
  for (const settlement of settlements) {
    if (!settlement.expenseId) {
      applySettlementToSlices(slices, settlement);
    }
  }
}

function buildSettledDebtSlices(
  expenses: Expense[],
  groupMemberIds: string[],
  settlements: ExpenseSettlementRef[]
): ExpenseDebtSlice[] {
  const slices = buildExpenseDebtSlices(expenses, groupMemberIds);
  applyAllSettlementsToSlices(slices, settlements);
  return slices;
}

/** Unsettled debtor slices after applying recorded payments (one pass per expense group). */
export function computeOpenExpenseDebtSlices(
  expenses: Expense[],
  groupMemberIds: string[],
  settlements: ExpenseSettlementRef[]
): ExpenseDebtSlice[] {
  return buildSettledDebtSlices(expenses, groupMemberIds, settlements).filter(
    (slice) => slice.remainingCents > 0
  );
}

export interface ExpenseSettlementAllocation {
  expenseId: string;
  amountCents: number;
}

/**
 * Split a person-to-person payment across open expense slices oldest-first
 * (same order as unlinked settlement application / Balances partial hint).
 */
export function allocateSettlementToExpenses(
  expenses: Expense[],
  groupMemberIds: string[],
  settlements: ExpenseSettlementRef[],
  fromUserId: string,
  toUserId: string,
  amountCents: number
): ExpenseSettlementAllocation[] {
  if (amountCents <= 0) return [];

  const openSlices = computeOpenExpenseDebtSlices(expenses, groupMemberIds, settlements).filter(
    (slice) => slice.debtorUserId === fromUserId && slice.payerUserId === toUserId
  );

  let remaining = amountCents;
  const allocations: ExpenseSettlementAllocation[] = [];

  for (const slice of openSlices) {
    if (remaining <= 0) break;
    const chunk = Math.min(slice.remainingCents, remaining);
    if (chunk <= 0) continue;
    allocations.push({ expenseId: slice.expenseId, amountCents: chunk });
    remaining -= chunk;
  }

  return allocations;
}

function computeExpenseDebtRemainingByExpenseId(
  expenses: Expense[],
  groupMemberIds: string[],
  settlements: ExpenseSettlementRef[]
): Map<string, number> {
  const slices = buildSettledDebtSlices(expenses, groupMemberIds, settlements);

  const remainingByExpenseId = new Map<string, number>();
  for (const expense of expenses) {
    remainingByExpenseId.set(expense.id, 0);
  }
  for (const slice of slices) {
    remainingByExpenseId.set(
      slice.expenseId,
      (remainingByExpenseId.get(slice.expenseId) ?? 0) + slice.remainingCents
    );
  }

  return remainingByExpenseId;
}

/** Split expenses into open vs fully settled lists (unsettled first, updatedAt ascending in each). */
export function partitionExpensesBySettlementStatus(
  expenses: Expense[],
  groupMemberIds: string[],
  settlements: ExpenseSettlementRef[]
): { openExpenses: Expense[]; settledExpenses: Expense[] } {
  const remainingByExpenseId = computeExpenseDebtRemainingByExpenseId(
    expenses,
    groupMemberIds,
    settlements
  );

  const openExpenses: Expense[] = [];
  const settledExpenses: Expense[] = [];

  for (const expense of expenses) {
    const remainingCents = remainingByExpenseId.get(expense.id) ?? 0;
    if (remainingCents <= 0) {
      settledExpenses.push(expense);
    } else {
      openExpenses.push(expense);
    }
  }

  openExpenses.sort(compareExpensesByUpdatedAtEarliest);
  settledExpenses.sort(compareExpensesByUpdatedAtEarliest);

  return { openExpenses, settledExpenses };
}

export function isExpenseFullySettled(
  expense: Expense,
  groupMemberIds: string[],
  allExpenses: Expense[],
  settlements: ExpenseSettlementRef[]
): boolean {
  const remainingByExpenseId = computeExpenseDebtRemainingByExpenseId(
    allExpenses,
    groupMemberIds,
    settlements
  );
  return (remainingByExpenseId.get(expense.id) ?? 0) <= 0;
}

/** Amount the user owes for a single expense (null if they paid or owe nothing). */
export function getUserExpenseShareCents(
  expense: Expense,
  userId: string,
  groupMemberIds: string[]
): number | null {
  if (expense.paidByUserId === userId) return null;

  const portions = computeExpensePortionsCents(expense, groupMemberIds);
  const shareCents = portions.get(userId) ?? 0;
  return shareCents > 0 ? shareCents : null;
}

export function getUserExpenseShareRemainingCents(
  expense: Expense,
  userId: string,
  groupMemberIds: string[],
  allExpenses: Expense[],
  settlements: ExpenseSettlementRef[] = []
): number {
  if (getUserExpenseShareCents(expense, userId, groupMemberIds) == null) return 0;

  const slice = buildSettledDebtSlices(allExpenses, groupMemberIds, settlements).find(
    (entry) => entry.expenseId === expense.id && entry.debtorUserId === userId
  );
  return slice?.remainingCents ?? 0;
}

export function isExpenseSettledByUser(
  expense: Expense,
  userId: string,
  groupMemberIds: string[],
  allExpenses: Expense[],
  settlements: ExpenseSettlementRef[]
): boolean {
  return (
    getUserExpenseShareRemainingCents(expense, userId, groupMemberIds, allExpenses, settlements) ===
      0 && getUserExpenseShareCents(expense, userId, groupMemberIds) != null
  );
}

/** Settlements recorded for the current user's share of a specific expense. */
export function findLinkedSettlementsForUserExpense(
  expense: Expense,
  userId: string,
  settlements: Pick<ExpenseSettlement, 'id' | 'expenseId' | 'fromUserId' | 'toUserId'>[]
): Pick<ExpenseSettlement, 'id'>[] {
  return settlements.filter(
    (settlement) =>
      settlement.expenseId === expense.id &&
      settlement.fromUserId === userId &&
      settlement.toUserId === expense.paidByUserId
  );
}

export function parseExactSplitInput(raw: string): number | null {
  return parseExpenseAmountToCents(raw);
}
