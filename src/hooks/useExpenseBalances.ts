import { useMemo } from 'react';
import { Expense, ExpenseGroup, ExpenseSettlement } from '../types/expenses';
import {
  computeDirectBalanceTransfers,
  computeMemberBalances,
  simplifyBalanceTransfers,
} from '../utils/expenseBalances';

export function useExpenseBalances(
  expenseGroup: ExpenseGroup | null,
  expenses: Expense[],
  settlements: ExpenseSettlement[] = [],
  simplifyDebts = false
) {
  const balances = useMemo(
    () =>
      expenseGroup ? computeMemberBalances(expenseGroup, expenses, settlements) : [],
    [expenseGroup, expenses, settlements]
  );

  const transfers = useMemo(() => {
    if (!expenseGroup) return [];
    if (simplifyDebts) {
      return simplifyBalanceTransfers(balances);
    }
    return computeDirectBalanceTransfers(expenseGroup, expenses, settlements);
  }, [expenseGroup, expenses, settlements, balances, simplifyDebts]);

  return { balances, transfers };
}
