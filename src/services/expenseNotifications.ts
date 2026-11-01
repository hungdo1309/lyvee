import {
  Expense,
  ExpenseGroup,
  ExpenseInput,
  ExpenseSettlement,
} from '../types/expenses';
import { Trip } from '../types/trips';
import { formatExpenseMoney } from '../utils/expenseMoney';
import {
  expenseHasMeaningfulChanges,
  getExpenseGroupContextLabel,
  getExpenseGroupMemberNotificationRecipients,
  getExpenseNotificationRecipients,
  getExpenseUpdateNotificationRecipients,
  getSettlementNotificationRecipients,
  getTripExpenseGroupDeletedRecipients,
} from '../utils/expenseNotificationRules';
import { getUserProfile, getUsersByIds } from './auth';
import { enqueuePushEvent } from './pushNotifications';

async function actorName(actorId: string): Promise<string> {
  const profile = await getUserProfile(actorId);
  return profile?.name ?? 'Someone';
}

async function memberNameById(userIds: string[]): Promise<Map<string, string>> {
  const users = await getUsersByIds(uniqueUserIds(userIds));
  return new Map(users.map((user) => [user.id, user.name]));
}

function uniqueUserIds(userIds: string[]): string[] {
  return [...new Set(userIds.filter(Boolean))];
}

function buildExpenseData(expenseGroup: ExpenseGroup, expenseId: string) {
  return {
    type: 'expense.created' as const,
    groupId: expenseGroup.groupId,
    expenseGroupId: expenseGroup.id,
    expenseId,
    ...(expenseGroup.tripId ? { tripId: expenseGroup.tripId } : {}),
  };
}

export async function notifyExpenseCreated(
  expenseGroup: ExpenseGroup,
  expense: Expense,
  actorId: string,
  trip?: Trip | null
): Promise<void> {
  const recipientIds = getExpenseNotificationRecipients(
    expense,
    expenseGroup.memberIds,
    actorId
  );
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);
  const amount = formatExpenseMoney(expense.amountCents, expenseGroup.currency);

  await enqueuePushEvent({
    type: 'expense.created',
    actorId,
    actorName: name,
    recipientIds,
    title: 'New expense',
    body: `${name} added "${expense.description}" (${amount}) in ${context}.`,
    data: buildExpenseData(expenseGroup, expense.id),
  });
}

export async function notifyExpenseUpdated(
  expenseGroup: ExpenseGroup,
  before: Expense,
  input: ExpenseInput,
  actorId: string,
  trip?: Trip | null
): Promise<void> {
  if (!expenseHasMeaningfulChanges(before, input)) return;

  const recipientIds = getExpenseUpdateNotificationRecipients(
    before,
    input,
    expenseGroup.memberIds,
    actorId
  );
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);
  const amountChanged = input.amountCents !== before.amountCents;
  const amountSuffix = amountChanged
    ? ` (${formatExpenseMoney(before.amountCents, expenseGroup.currency)} → ${formatExpenseMoney(input.amountCents, expenseGroup.currency)})`
    : '';

  await enqueuePushEvent({
    type: 'expense.updated',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Expense updated',
    body: `${name} updated "${input.description.trim()}"${amountSuffix} in ${context}.`,
    data: {
      type: 'expense.updated',
      groupId: expenseGroup.groupId,
      expenseGroupId: expenseGroup.id,
      expenseId: before.id,
      ...(expenseGroup.tripId ? { tripId: expenseGroup.tripId } : {}),
    },
  });
}

export async function notifyExpenseDeleted(
  expenseGroup: ExpenseGroup,
  expense: Expense,
  actorId: string,
  trip?: Trip | null
): Promise<void> {
  const recipientIds = getExpenseNotificationRecipients(
    expense,
    expenseGroup.memberIds,
    actorId
  );
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);

  await enqueuePushEvent({
    type: 'expense.deleted',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Expense deleted',
    body: `${name} deleted "${expense.description}" from ${context}.`,
    data: {
      type: 'expense.deleted',
      groupId: expenseGroup.groupId,
      expenseGroupId: expenseGroup.id,
      expenseId: expense.id,
      ...(expenseGroup.tripId ? { tripId: expenseGroup.tripId } : {}),
    },
  });
}

export async function notifyExpensePaymentRecorded(
  expenseGroup: ExpenseGroup,
  payment: Pick<ExpenseSettlement, 'fromUserId' | 'toUserId' | 'amountCents'> & {
    id?: string;
    expenseId?: string;
  },
  actorId: string,
  trip?: Trip | null
): Promise<void> {
  const recipientIds = getSettlementNotificationRecipients(payment, actorId);
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);
  const names = await memberNameById([payment.fromUserId, payment.toUserId]);
  const fromName = names.get(payment.fromUserId) ?? 'Member';
  const toName = names.get(payment.toUserId) ?? 'Member';
  const amount = formatExpenseMoney(payment.amountCents, expenseGroup.currency);

  await enqueuePushEvent({
    type: 'expense.settlement.added',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Payment recorded',
    body: `${name} recorded that ${fromName} paid ${toName} ${amount} in ${context}.`,
    data: {
      type: 'expense.settlement.added',
      groupId: expenseGroup.groupId,
      expenseGroupId: expenseGroup.id,
      ...(payment.id ? { settlementId: payment.id } : {}),
      ...(payment.expenseId ? { expenseId: payment.expenseId } : {}),
      ...(expenseGroup.tripId ? { tripId: expenseGroup.tripId } : {}),
    },
  });
}

export async function notifyExpenseSettlementAdded(
  expenseGroup: ExpenseGroup,
  settlement: ExpenseSettlement,
  actorId: string,
  trip?: Trip | null
): Promise<void> {
  await notifyExpensePaymentRecorded(expenseGroup, settlement, actorId, trip);
}

export async function notifyExpenseSettlementRemoved(
  expenseGroup: ExpenseGroup,
  settlement: ExpenseSettlement,
  actorId: string,
  trip?: Trip | null
): Promise<void> {
  const recipientIds = getSettlementNotificationRecipients(settlement, actorId);
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);
  const names = await memberNameById([settlement.fromUserId, settlement.toUserId]);
  const fromName = names.get(settlement.fromUserId) ?? 'Member';
  const toName = names.get(settlement.toUserId) ?? 'Member';
  const amount = formatExpenseMoney(settlement.amountCents, expenseGroup.currency);

  await enqueuePushEvent({
    type: 'expense.settlement.removed',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Payment removed',
    body: `${name} removed a ${amount} payment between ${fromName} and ${toName} in ${context}.`,
    data: {
      type: 'expense.settlement.removed',
      groupId: expenseGroup.groupId,
      expenseGroupId: expenseGroup.id,
      settlementId: settlement.id,
      ...(settlement.expenseId ? { expenseId: settlement.expenseId } : {}),
      ...(expenseGroup.tripId ? { tripId: expenseGroup.tripId } : {}),
    },
  });
}

/** Trip expense bucket created — notifies trip expense group members. */
export async function notifyTripExpenseGroupCreated(
  expenseGroup: ExpenseGroup,
  trip: Trip,
  actorId: string
): Promise<void> {
  if (!expenseGroup.tripId) return;

  const recipientIds = getExpenseGroupMemberNotificationRecipients(expenseGroup, actorId);
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);

  await enqueuePushEvent({
    type: 'expense.group.created',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Trip expenses ready',
    body: `${name} set up trip expenses for ${context}.`,
    data: {
      type: 'expense.group.created',
      groupId: expenseGroup.groupId,
      expenseGroupId: expenseGroup.id,
      tripId: expenseGroup.tripId,
    },
  });
}

/** Trip-linked expense group deleted by a user — not when the trip or group is deleted. */
export async function notifyTripExpenseGroupDeleted(
  expenseGroup: ExpenseGroup,
  trip: Trip | null,
  actorId: string
): Promise<void> {
  if (!expenseGroup.tripId) return;

  const recipientIds = getTripExpenseGroupDeletedRecipients(expenseGroup, actorId);
  if (recipientIds.length === 0) return;

  const name = await actorName(actorId);
  const context = getExpenseGroupContextLabel(expenseGroup, trip);

  await enqueuePushEvent({
    type: 'expense.group.deleted',
    actorId,
    actorName: name,
    recipientIds,
    title: 'Trip expenses deleted',
    body: `${name} deleted trip expenses for ${context}.`,
    data: {
      type: 'expense.group.deleted',
      groupId: expenseGroup.groupId,
      expenseGroupId: expenseGroup.id,
      tripId: expenseGroup.tripId,
    },
  });
}
