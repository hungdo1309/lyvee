import { Expense, ExpenseGroup, ExpenseSettlement } from '../types/expenses';
import { computeExpensePortionsCents } from './expenseSplits';

export interface MemberBalance {
  userId: string;
  netCents: number;
}

export interface BalanceTransfer {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export function computeMemberBalances(
  expenseGroup: Pick<ExpenseGroup, 'memberIds'>,
  expenses: Expense[],
  settlements: ExpenseSettlement[] = []
): MemberBalance[] {
  const balances = new Map<string, number>();
  for (const memberId of expenseGroup.memberIds) {
    balances.set(memberId, 0);
  }

  for (const expense of expenses) {
    const portions = computeExpensePortionsCents(expense, expenseGroup.memberIds);
    if (portions.size === 0) continue;

    balances.set(
      expense.paidByUserId,
      (balances.get(expense.paidByUserId) ?? 0) + expense.amountCents
    );

    for (const [userId, portionCents] of portions) {
      balances.set(userId, (balances.get(userId) ?? 0) - portionCents);
    }
  }

  for (const settlement of settlements) {
    balances.set(
      settlement.fromUserId,
      (balances.get(settlement.fromUserId) ?? 0) + settlement.amountCents
    );
    balances.set(
      settlement.toUserId,
      (balances.get(settlement.toUserId) ?? 0) - settlement.amountCents
    );
  }

  return expenseGroup.memberIds.map((userId) => ({
    userId,
    netCents: balances.get(userId) ?? 0,
  }));
}

function pairDebtKey(fromUserId: string, toUserId: string): string {
  return `${fromUserId}:${toUserId}`;
}

function adjustPairDebt(
  debts: Map<string, number>,
  fromUserId: string,
  toUserId: string,
  deltaCents: number
): void {
  if (fromUserId === toUserId || deltaCents === 0) return;

  const forwardKey = pairDebtKey(fromUserId, toUserId);
  const reverseKey = pairDebtKey(toUserId, fromUserId);
  const reverseAmount = debts.get(reverseKey) ?? 0;

  if (reverseAmount > 0) {
    if (deltaCents >= reverseAmount) {
      debts.delete(reverseKey);
      const remainder = deltaCents - reverseAmount;
      if (remainder > 0) {
        debts.set(forwardKey, (debts.get(forwardKey) ?? 0) + remainder);
      }
    } else {
      debts.set(reverseKey, reverseAmount - deltaCents);
    }
    return;
  }

  debts.set(forwardKey, (debts.get(forwardKey) ?? 0) + deltaCents);
}

/** Per-expense debts without combining members' balances (Splitwise "simplify off"). */
export function computeDirectBalanceTransfers(
  expenseGroup: Pick<ExpenseGroup, 'memberIds'>,
  expenses: Expense[],
  settlements: ExpenseSettlement[] = []
): BalanceTransfer[] {
  const debts = new Map<string, number>();

  for (const expense of expenses) {
    const portions = computeExpensePortionsCents(expense, expenseGroup.memberIds);
    for (const [userId, portionCents] of portions) {
      if (userId !== expense.paidByUserId && portionCents > 0) {
        adjustPairDebt(debts, userId, expense.paidByUserId, portionCents);
      }
    }
  }

  for (const settlement of settlements) {
    adjustPairDebt(debts, settlement.fromUserId, settlement.toUserId, -settlement.amountCents);
  }

  const transfers: BalanceTransfer[] = [];
  for (const [key, amountCents] of debts) {
    if (amountCents <= 0) continue;
    const separatorIndex = key.indexOf(':');
    transfers.push({
      fromUserId: key.slice(0, separatorIndex),
      toUserId: key.slice(separatorIndex + 1),
      amountCents,
    });
  }

  return transfers.sort((left, right) => {
    const amountCompare = right.amountCents - left.amountCents;
    if (amountCompare !== 0) return amountCompare;
    return left.fromUserId.localeCompare(right.fromUserId);
  });
}

/** Greedy simplification of who should pay whom (Splitwise-style summary). */
export function simplifyBalanceTransfers(balances: MemberBalance[]): BalanceTransfer[] {
  const creditors = balances
    .filter((entry) => entry.netCents > 0)
    .map((entry) => ({ ...entry }))
    .sort((left, right) => right.netCents - left.netCents);
  const debtors = balances
    .filter((entry) => entry.netCents < 0)
    .map((entry) => ({ userId: entry.userId, netCents: -entry.netCents }))
    .sort((left, right) => right.netCents - left.netCents);

  const transfers: BalanceTransfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountCents = Math.min(creditor.netCents, debtor.netCents);

    if (amountCents <= 0) break;

    transfers.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amountCents,
    });

    creditor.netCents -= amountCents;
    debtor.netCents -= amountCents;

    if (creditor.netCents === 0) creditorIndex += 1;
    if (debtor.netCents === 0) debtorIndex += 1;
  }

  return transfers;
}
