export type ExpenseSplitMode = 'equal' | 'exact' | 'percentage' | 'shares';

/** 100% is stored as 10000 (hundredths of a percent). */
export const PERCENTAGE_SCALE = 10_000;

export interface ExpenseGroup {
  id: string;
  groupId: string;
  /** When set, this expense group is tied to a single trip (one trip → one expense group). */
  tripId?: string;
  /** One auto-created group expense bucket per LyVee group. */
  isDefault?: boolean;
  name: string;
  memberIds: string[];
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseGroupInput {
  groupId: string;
  tripId?: string;
  isDefault?: boolean;
  name: string;
  memberIds: string[];
  currency?: string;
}

export interface Expense {
  id: string;
  expenseGroupId: string;
  description: string;
  /** Stored in minor units (cents) to avoid float drift. */
  amountCents: number;
  paidByUserId: string;
  /** Members in this split. Empty = all group members. */
  splitAmongUserIds: string[];
  /** How the expense is divided among splitAmongUserIds. Defaults to equal. */
  splitMode?: ExpenseSplitMode;
  /**
   * Per-member split input. Meaning depends on splitMode:
   * - exact: cents owed
   * - percentage: basis points of 100% (10000 = 100%)
   * - shares: share count (>= 1)
   */
  splitValues?: Record<string, number>;
  expenseDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  description: string;
  amountCents: number;
  paidByUserId: string;
  splitAmongUserIds: string[];
  splitMode?: ExpenseSplitMode;
  splitValues?: Record<string, number>;
  expenseDate: string;
}

export interface ExpenseSettlement {
  id: string;
  expenseGroupId: string;
  /** When set, this payment settles one member's share of a specific expense. */
  expenseId?: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  settlementDate: string;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSettlementInput {
  expenseId?: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  settlementDate: string;
  note?: string;
}

export const DEFAULT_EXPENSE_CURRENCY = 'USD';
export const GROUP_EXPENSE_NAME = 'Group Expenses';
