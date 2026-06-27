import { Expense, ExpenseGroup, ExpenseInput, ExpenseSettlement } from '../types/expenses';
import { Trip } from '../types/trips';
import { GROUP_EXPENSE_NAME } from '../types/expenses';
import { excludeActor, uniqueIds } from './pushRecipients';

export function getExpenseInvolvedMemberIds(
  expense: Pick<Expense, 'paidByUserId' | 'splitAmongUserIds'>,
  expenseGroupMemberIds: string[]
): string[] {
  const participants =
    expense.splitAmongUserIds.length > 0
      ? expense.splitAmongUserIds
      : expenseGroupMemberIds;

  return uniqueIds([expense.paidByUserId, ...participants]);
}

export function getExpenseNotificationRecipients(
  expense: Pick<Expense, 'paidByUserId' | 'splitAmongUserIds'>,
  expenseGroupMemberIds: string[],
  actorId: string
): string[] {
  return excludeActor(
    actorId,
    getExpenseInvolvedMemberIds(expense, expenseGroupMemberIds)
  );
}

/** Notify the payee that a payment was recorded or removed. The payer already knows if they initiated it. */
export function getSettlementNotificationRecipients(
  settlement: Pick<ExpenseSettlement, 'toUserId'>,
  actorId: string
): string[] {
  return excludeActor(actorId, [settlement.toUserId]);
}

export function getTripExpenseGroupDeletedRecipients(
  expenseGroup: Pick<ExpenseGroup, 'memberIds'>,
  actorId: string
): string[] {
  return getExpenseGroupMemberNotificationRecipients(expenseGroup, actorId);
}

export function expenseHasMeaningfulChanges(
  before: Expense,
  input: ExpenseInput
): boolean {
  if (input.description.trim() !== before.description) return true;
  if (input.amountCents !== before.amountCents) return true;
  if (input.paidByUserId !== before.paidByUserId) return true;
  if (input.expenseDate !== before.expenseDate) return true;
  if (input.splitMode !== (before.splitMode ?? 'equal')) return true;
  if (
    JSON.stringify(uniqueIds(input.splitAmongUserIds).sort()) !==
    JSON.stringify(
      uniqueIds(
        before.splitAmongUserIds.length > 0 ? before.splitAmongUserIds : []
      ).sort()
    )
  ) {
    return true;
  }
  if (JSON.stringify(input.splitValues ?? {}) !== JSON.stringify(before.splitValues ?? {})) {
    return true;
  }
  return false;
}

export function getExpenseUpdateNotificationRecipients(
  before: Expense,
  input: ExpenseInput,
  expenseGroupMemberIds: string[],
  actorId: string
): string[] {
  const beforeInvolved = getExpenseInvolvedMemberIds(before, expenseGroupMemberIds);
  const afterInvolved = getExpenseInvolvedMemberIds(
    {
      paidByUserId: input.paidByUserId,
      splitAmongUserIds: input.splitAmongUserIds,
    },
    expenseGroupMemberIds
  );
  return excludeActor(actorId, uniqueIds([...beforeInvolved, ...afterInvolved]));
}

export function getExpenseGroupMemberNotificationRecipients(
  expenseGroup: Pick<ExpenseGroup, 'memberIds'>,
  actorId: string
): string[] {
  return excludeActor(actorId, expenseGroup.memberIds);
}

export function getExpenseGroupContextLabel(
  expenseGroup: Pick<ExpenseGroup, 'isDefault' | 'tripId' | 'name'>,
  trip?: Pick<Trip, 'destination'> | null
): string {
  if (expenseGroup.isDefault) return GROUP_EXPENSE_NAME;
  if (expenseGroup.tripId) {
    return trip?.destination?.trim() || expenseGroup.name || 'Trip expenses';
  }
  return expenseGroup.name || GROUP_EXPENSE_NAME;
}
