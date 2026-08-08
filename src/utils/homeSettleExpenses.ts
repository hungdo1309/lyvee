import { Expense, ExpenseGroup, ExpenseSettlement, GROUP_EXPENSE_NAME } from '../types/expenses';
import { Trip } from '../types/trips';
import { computeDirectBalanceTransfers } from './expenseBalances';
import { getTripTitleForExpenseGroup } from './expenses';

export interface HomePersonDebtPart {
  expenseGroup: ExpenseGroup;
  expenseGroupLabel: string;
  amountCents: number;
  /** Earliest expense date in this group (yyyy-MM-dd); used to allocate oldest-first. */
  earliestExpenseDate: string;
}

export interface HomePersonDebtEntry {
  toUserId: string;
  currency: string;
  totalCents: number;
  parts: HomePersonDebtPart[];
}

export interface HomePersonSettlementAllocation {
  expenseGroup: ExpenseGroup;
  amountCents: number;
}

export function getExpenseGroupLabel(
  expenseGroup: ExpenseGroup,
  trips: Trip[]
): string {
  if (expenseGroup.isDefault) return GROUP_EXPENSE_NAME;
  if (expenseGroup.tripId) return getTripTitleForExpenseGroup(expenseGroup, trips);
  return expenseGroup.name;
}

function earliestExpenseDate(expenses: Expense[]): string {
  let earliest = '';
  for (const expense of expenses) {
    if (!earliest || expense.expenseDate.localeCompare(earliest) < 0) {
      earliest = expense.expenseDate;
    }
  }
  return earliest || '9999-99-99';
}

function personDebtKey(toUserId: string, currency: string): string {
  return `${toUserId}:${currency}`;
}

function compareParts(left: HomePersonDebtPart, right: HomePersonDebtPart): number {
  const dateCompare = left.earliestExpenseDate.localeCompare(right.earliestExpenseDate);
  if (dateCompare !== 0) return dateCompare;
  return left.expenseGroup.id.localeCompare(right.expenseGroup.id);
}

/**
 * Combined direct debts the viewer owes each person across all visible expense groups
 * (household + trips). Uses Balances-style computeDirectBalanceTransfers (simplify off).
 */
export function buildHomePersonDebtEntries(
  viewerUserId: string,
  visibleExpenseGroups: ExpenseGroup[],
  expensesByGroupId: Map<string, Expense[]>,
  settlementsByGroupId: Map<string, ExpenseSettlement[]>,
  trips: Trip[]
): HomePersonDebtEntry[] {
  const byKey = new Map<string, HomePersonDebtEntry>();

  for (const expenseGroup of visibleExpenseGroups) {
    const expenses = expensesByGroupId.get(expenseGroup.id) ?? [];
    const settlements = settlementsByGroupId.get(expenseGroup.id) ?? [];
    if (expenses.length === 0) continue;

    const transfers = computeDirectBalanceTransfers(
      expenseGroup,
      expenses,
      settlements
    );
    const owedHere = transfers.filter(
      (transfer) =>
        transfer.fromUserId === viewerUserId && transfer.amountCents > 0
    );
    if (owedHere.length === 0) continue;

    const label = getExpenseGroupLabel(expenseGroup, trips);
    const earliest = earliestExpenseDate(expenses);

    for (const transfer of owedHere) {
      const key = personDebtKey(transfer.toUserId, expenseGroup.currency);
      const existing = byKey.get(key);
      const part: HomePersonDebtPart = {
        expenseGroup,
        expenseGroupLabel: label,
        amountCents: transfer.amountCents,
        earliestExpenseDate: earliest,
      };

      if (existing) {
        existing.totalCents += transfer.amountCents;
        existing.parts.push(part);
      } else {
        byKey.set(key, {
          toUserId: transfer.toUserId,
          currency: expenseGroup.currency,
          totalCents: transfer.amountCents,
          parts: [part],
        });
      }
    }
  }

  const entries = Array.from(byKey.values());
  for (const entry of entries) {
    entry.parts.sort(compareParts);
  }

  return entries.sort((left, right) => {
    const amountCompare = right.totalCents - left.totalCents;
    if (amountCompare !== 0) return amountCompare;
    const currencyCompare = left.currency.localeCompare(right.currency);
    if (currencyCompare !== 0) return currencyCompare;
    return left.toUserId.localeCompare(right.toUserId);
  });
}

/**
 * Split a payment across expense-group parts oldest-first (same idea as Balances
 * partial payments applying to oldest unsettled first).
 */
export function allocatePersonSettlement(
  entry: HomePersonDebtEntry,
  amountCents: number
): HomePersonSettlementAllocation[] {
  if (amountCents <= 0) return [];

  let remaining = Math.min(amountCents, entry.totalCents);
  const allocations: HomePersonSettlementAllocation[] = [];

  for (const part of entry.parts) {
    if (remaining <= 0) break;
    const chunk = Math.min(part.amountCents, remaining);
    if (chunk <= 0) continue;
    allocations.push({
      expenseGroup: part.expenseGroup,
      amountCents: chunk,
    });
    remaining -= chunk;
  }

  return allocations;
}

export function homePersonDebtEntryKey(entry: HomePersonDebtEntry): string {
  return personDebtKey(entry.toUserId, entry.currency);
}
