import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  deleteField,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  DEFAULT_EXPENSE_CURRENCY,
  Expense,
  ExpenseGroup,
  ExpenseGroupInput,
  ExpenseInput,
  ExpenseSettlement,
  ExpenseSettlementInput,
  ExpenseSplitMode,
  GROUP_EXPENSE_NAME,
} from '../types/expenses';
import { Trip } from '../types/trips';
import { stripUndefined } from '../utils/firestore';
import {
  canDeleteExpenseGroup,
  canEditExpenseGroup,
  canViewExpenseGroup,
  normalizeExpenseMemberIds,
  resolveTripExpenseMemberIds,
} from '../utils/expensePermissions';
import { membersMatch } from '../utils/expenses';
import { validateExpenseSplit } from '../utils/expenseSplits';
import { getGroup } from './groupLookup';
import { getTrip } from './trips';
import {
  notifyExpenseCreated,
  notifyExpenseDeleted,
  notifyExpenseSettlementAdded,
  notifyExpenseSettlementRemoved,
  notifyExpenseUpdated,
  notifyTripExpenseGroupCreated,
  notifyTripExpenseGroupDeleted,
} from './expenseNotifications';

const MAX_EXPENSE_GROUP_MEMBERS = 50;
const MAX_EXPENSE_GROUP_NAME_LENGTH = 80;
const MAX_EXPENSE_DESCRIPTION_LENGTH = 120;
const MAX_SETTLEMENT_NOTE_LENGTH = 200;

function parseMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function parseExpenseGroup(id: string, data: Record<string, unknown>): ExpenseGroup {
  return {
    id,
    groupId: String(data.groupId ?? ''),
    tripId: typeof data.tripId === 'string' && data.tripId.length > 0 ? data.tripId : undefined,
    isDefault: data.isDefault === true,
    name: String(data.name ?? ''),
    memberIds: parseMemberIds(data.memberIds),
    currency:
      typeof data.currency === 'string' && data.currency.length > 0
        ? data.currency
        : DEFAULT_EXPENSE_CURRENCY,
    createdBy: String(data.createdBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

function parseSplitValues(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseSplitMode(raw: unknown): ExpenseSplitMode | undefined {
  if (raw === 'equal' || raw === 'exact' || raw === 'percentage' || raw === 'shares') {
    return raw;
  }
  return undefined;
}

function parseExpense(id: string, expenseGroupId: string, data: Record<string, unknown>): Expense {
  return {
    id,
    expenseGroupId,
    description: String(data.description ?? ''),
    amountCents: typeof data.amountCents === 'number' ? data.amountCents : 0,
    paidByUserId: String(data.paidByUserId ?? ''),
    splitAmongUserIds: parseMemberIds(data.splitAmongUserIds),
    splitMode: parseSplitMode(data.splitMode),
    splitValues: parseSplitValues(data.splitValues),
    expenseDate: String(data.expenseDate ?? ''),
    createdBy: String(data.createdBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

function parseSettlement(
  id: string,
  expenseGroupId: string,
  data: Record<string, unknown>
): ExpenseSettlement {
  return {
    id,
    expenseGroupId,
    expenseId:
      typeof data.expenseId === 'string' && data.expenseId.length > 0 ? data.expenseId : undefined,
    fromUserId: String(data.fromUserId ?? ''),
    toUserId: String(data.toUserId ?? ''),
    amountCents: typeof data.amountCents === 'number' ? data.amountCents : 0,
    settlementDate: String(data.settlementDate ?? ''),
    note:
      typeof data.note === 'string' && data.note.length > 0 ? data.note : undefined,
    createdBy: String(data.createdBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

function sortExpenseGroups(groups: ExpenseGroup[]): ExpenseGroup[] {
  return [...groups].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((left, right) => {
    const dateCompare = right.expenseDate.localeCompare(left.expenseDate);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function sortSettlements(settlements: ExpenseSettlement[]): ExpenseSettlement[] {
  return [...settlements].sort((left, right) => {
    const dateCompare = right.settlementDate.localeCompare(left.settlementDate);
    if (dateCompare !== 0) return dateCompare;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function buildGroupExpenseGroupsQuery(groupId: string, userId: string) {
  return query(
    collection(db, 'expenseGroups'),
    where('groupId', '==', groupId),
    where('memberIds', 'array-contains', userId)
  );
}

function buildDefaultGroupExpenseGroupQuery(groupId: string, userId: string) {
  return query(
    collection(db, 'expenseGroups'),
    where('groupId', '==', groupId),
    where('isDefault', '==', true),
    where('memberIds', 'array-contains', userId),
    limit(1)
  );
}

function buildTripExpenseGroupQuery(groupId: string, tripId: string, userId: string) {
  return query(
    collection(db, 'expenseGroups'),
    where('groupId', '==', groupId),
    where('tripId', '==', tripId),
    where('memberIds', 'array-contains', userId),
    limit(1)
  );
}

async function syncDefaultGroupExpenseMembers(
  expenseGroup: ExpenseGroup,
  groupMembers: string[]
): Promise<ExpenseGroup> {
  if (!membersMatch(expenseGroup.memberIds, groupMembers)) {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'expenseGroups', expenseGroup.id),
      {
        memberIds: groupMembers,
        updatedAt: now,
      },
      { merge: true }
    );
    return { ...expenseGroup, memberIds: groupMembers, updatedAt: now };
  }
  return expenseGroup;
}

async function linkExpenseGroupToTrip(tripId: string, expenseGroupId: string): Promise<void> {
  await setDoc(
    doc(db, 'trips', tripId),
    stripUndefined({
      expenseGroupId,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
}

async function unlinkExpenseGroupFromTrip(tripId: string): Promise<void> {
  await setDoc(
    doc(db, 'trips', tripId),
    {
      expenseGroupId: deleteField(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

function validateExpenseGroupInput(
  input: ExpenseGroupInput,
  userId: string,
  groupMembers: string[]
): ExpenseGroupInput {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error('Enter a name (at least 2 characters)');
  }
  if (name.length > MAX_EXPENSE_GROUP_NAME_LENGTH) {
    throw new Error(`Name can be up to ${MAX_EXPENSE_GROUP_NAME_LENGTH} characters`);
  }
  if (!input.groupId) {
    throw new Error('Select a group for this expense group');
  }

  const memberIds = normalizeExpenseMemberIds(input.memberIds, groupMembers, userId);
  if (memberIds.length === 0) {
    throw new Error('Add at least one member to this expense group');
  }
  if (memberIds.length > MAX_EXPENSE_GROUP_MEMBERS) {
    throw new Error(`An expense group can include up to ${MAX_EXPENSE_GROUP_MEMBERS} members`);
  }

  return {
    groupId: input.groupId,
    tripId: input.tripId?.trim() || undefined,
    isDefault: input.isDefault === true,
    name,
    memberIds,
    currency: input.currency?.trim().toUpperCase() || DEFAULT_EXPENSE_CURRENCY,
  };
}

function validateExpenseInput(input: ExpenseInput, memberIds: string[]): ExpenseInput {
  const description = input.description.trim();
  if (description.length < 1) {
    throw new Error('Enter a description');
  }
  if (description.length > MAX_EXPENSE_DESCRIPTION_LENGTH) {
    throw new Error(`Description can be up to ${MAX_EXPENSE_DESCRIPTION_LENGTH} characters`);
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Enter a valid amount');
  }
  if (!memberIds.includes(input.paidByUserId)) {
    throw new Error('Choose who paid from group members');
  }

  const splitAmongUserIds =
    input.splitAmongUserIds.length > 0
      ? input.splitAmongUserIds.filter((id) => memberIds.includes(id))
      : memberIds;

  if (splitAmongUserIds.length === 0) {
    throw new Error('Choose at least one person to split with');
  }

  if (!input.expenseDate) {
    throw new Error('Choose an expense date');
  }

  const split = validateExpenseSplit(input, memberIds);

  return {
    description,
    amountCents: input.amountCents,
    paidByUserId: input.paidByUserId,
    splitAmongUserIds,
    splitMode: split.splitMode,
    splitValues: split.splitValues,
    expenseDate: input.expenseDate,
  };
}

function validateSettlementInput(
  input: ExpenseSettlementInput,
  memberIds: string[]
): ExpenseSettlementInput {
  if (!memberIds.includes(input.fromUserId)) {
    throw new Error('Choose who paid from group members');
  }
  if (!memberIds.includes(input.toUserId)) {
    throw new Error('Choose who received payment from group members');
  }
  if (input.fromUserId === input.toUserId) {
    throw new Error('Payer and recipient must be different');
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Enter a valid amount');
  }
  if (!input.settlementDate) {
    throw new Error('Choose a settlement date');
  }

  const note = input.note?.trim();
  if (note && note.length > MAX_SETTLEMENT_NOTE_LENGTH) {
    throw new Error(`Note can be up to ${MAX_SETTLEMENT_NOTE_LENGTH} characters`);
  }

  return {
    expenseId: input.expenseId?.trim() || undefined,
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    amountCents: input.amountCents,
    settlementDate: input.settlementDate,
    note: note || undefined,
  };
}

async function tryGetExpenseGroup(expenseGroupId: string): Promise<ExpenseGroup | null> {
  try {
    return await getExpenseGroup(expenseGroupId);
  } catch {
    return null;
  }
}

export async function getExpenseGroupByTripId(
  groupId: string,
  tripId: string,
  userId: string
): Promise<ExpenseGroup | null> {
  const snapshot = await getDocs(buildTripExpenseGroupQuery(groupId, tripId, userId));
  if (snapshot.empty) return null;
  const entry = snapshot.docs[0];
  return parseExpenseGroup(entry.id, entry.data() as Record<string, unknown>);
}

export async function tryGetExpenseGroupByTripId(
  groupId: string,
  tripId: string,
  userId: string
): Promise<ExpenseGroup | null> {
  try {
    return await getExpenseGroupByTripId(groupId, tripId, userId);
  } catch {
    return null;
  }
}

async function resolveLinkedTripExpenseGroupId(trip: Trip): Promise<string | null> {
  if (!trip.expenseGroupId) return null;
  const linked = await tryGetExpenseGroup(trip.expenseGroupId);
  if (linked) return linked.id;
  try {
    await unlinkExpenseGroupFromTrip(trip.id);
  } catch (error) {
    console.warn(
      `[expenseGroups] resolveLinkedTripExpenseGroupId (${trip.id}): unlink failed`,
      error
    );
  }
  return null;
}

async function getTripForExpenseGroup(expenseGroup: ExpenseGroup): Promise<Trip | null> {
  if (!expenseGroup.tripId) return null;
  return getTrip(expenseGroup.tripId);
}

export async function createExpenseGroup(
  userId: string,
  input: ExpenseGroupInput
): Promise<string> {
  const group = await getGroup(input.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  if (!group.members.includes(userId)) {
    throw new Error('You are not a member of this group');
  }

  const normalized = validateExpenseGroupInput(input, userId, group.members);
  if (normalized.tripId) {
    const trip = await getTrip(normalized.tripId);
    if (!trip || trip.groupId !== normalized.groupId) {
      throw new Error('Trip not found');
    }
  }
  if (normalized.isDefault && normalized.tripId) {
    throw new Error('A default group expense cannot be linked to a trip');
  }

  const id = doc(collection(db, 'expenseGroups')).id;
  const now = new Date().toISOString();
  const expenseGroupData = stripUndefined({
    groupId: normalized.groupId,
    ...(normalized.tripId ? { tripId: normalized.tripId } : {}),
    ...(normalized.isDefault ? { isDefault: true } : {}),
    name: normalized.name,
    memberIds: normalized.memberIds,
    currency: normalized.currency,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(doc(db, 'expenseGroups', id), expenseGroupData);

  if (normalized.tripId) {
    try {
      await linkExpenseGroupToTrip(normalized.tripId, id);
    } catch (error) {
      console.warn(
        `[expenseGroups] createExpenseGroup (${normalized.tripId}): trip link failed`,
        error
      );
    }

    const created = await getExpenseGroup(id);
    const trip = await getTrip(normalized.tripId);
    if (created && trip) {
      await notifyTripExpenseGroupCreated(created, trip, userId);
    }
  }

  return id;
}

export async function createTripExpenseGroup(userId: string, trip: Trip): Promise<string> {
  const freshTrip = (await getTrip(trip.id)) ?? trip;
  const group = await getGroup(freshTrip.groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const linkedId = await resolveLinkedTripExpenseGroupId(freshTrip);
  if (linkedId) {
    return linkedId;
  }

  const existing = await tryGetExpenseGroupByTripId(freshTrip.groupId, freshTrip.id, userId);
  if (existing) {
    try {
      await linkExpenseGroupToTrip(freshTrip.id, existing.id);
    } catch (error) {
      console.warn(
        `[expenseGroups] createTripExpenseGroup (${freshTrip.id}): trip link failed`,
        error
      );
    }
    return existing.id;
  }

  return createExpenseGroup(userId, {
    groupId: freshTrip.groupId,
    tripId: freshTrip.id,
    name: freshTrip.destination,
    memberIds: resolveTripExpenseMemberIds(freshTrip, group.members),
  });
}

/** Ensures the auto-created household expense bucket exists for a LyVee group. */
export async function ensureDefaultGroupExpenseGroup(
  userId: string,
  groupId: string
): Promise<ExpenseGroup> {
  const group = await getGroup(groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  if (!group.members.includes(userId)) {
    throw new Error('You are not a member of this group');
  }

  const existingSnapshot = await getDocs(buildDefaultGroupExpenseGroupQuery(groupId, userId));
  if (!existingSnapshot.empty) {
    const existing = parseExpenseGroup(
      existingSnapshot.docs[0].id,
      existingSnapshot.docs[0].data() as Record<string, unknown>
    );
    return syncDefaultGroupExpenseMembers(existing, group.members);
  }

  const id = await createExpenseGroup(userId, {
    groupId,
    isDefault: true,
    name: GROUP_EXPENSE_NAME,
    memberIds: group.members,
  });

  const created = await getExpenseGroup(id);
  if (!created) {
    throw new Error('Could not create group expense');
  }
  return created;
}

/** Keep a trip's expense group members aligned with trip membership. */
export async function syncTripExpenseGroupMembers(
  trip: Trip,
  memberIds: string[],
  requesterId: string
): Promise<void> {
  const group = await getGroup(trip.groupId);
  if (!group) return;

  const normalizedMembers = resolveTripExpenseMemberIds(
    { ...trip, memberIds },
    group.members
  );

  let expenseGroupId = trip.expenseGroupId;
  if (!expenseGroupId) {
    const existing = await tryGetExpenseGroupByTripId(trip.groupId, trip.id, requesterId);
    if (!existing) return;
    expenseGroupId = existing.id;
    if (!trip.expenseGroupId) {
      try {
        await linkExpenseGroupToTrip(trip.id, expenseGroupId);
      } catch (error) {
        console.warn(
          `[expenseGroups] syncTripExpenseGroupMembers (${trip.id}): trip link failed`,
          error
        );
      }
    }
  }

  const expenseGroup = await tryGetExpenseGroup(expenseGroupId);
  if (!expenseGroup || membersMatch(expenseGroup.memberIds, normalizedMembers)) {
    return;
  }

  await setDoc(
    doc(db, 'expenseGroups', expenseGroupId),
    {
      memberIds: normalizedMembers,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getExpenseGroup(expenseGroupId: string): Promise<ExpenseGroup | null> {
  const snap = await getDoc(doc(db, 'expenseGroups', expenseGroupId));
  if (!snap.exists()) return null;
  return parseExpenseGroup(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchGroupExpenseGroupsOnce(
  groupId: string,
  userId: string
): Promise<ExpenseGroup[]> {
  const snapshot = await getDocs(buildGroupExpenseGroupsQuery(groupId, userId));
  return sortExpenseGroups(
    snapshot.docs.map((entry) => parseExpenseGroup(entry.id, entry.data() as Record<string, unknown>))
  );
}

export async function fetchExpenseGroupsForGroups(
  groupIds: string[],
  userId: string
): Promise<Map<string, ExpenseGroup[]>> {
  const entries = await Promise.all(
    groupIds.map(async (groupId) => {
      const expenseGroups = await fetchGroupExpenseGroupsOnce(groupId, userId);
      return [groupId, expenseGroups] as const;
    })
  );
  return new Map(entries);
}

export function subscribeToGroupExpenseGroups(
  groupId: string,
  userId: string,
  onExpenseGroups: (expenseGroups: ExpenseGroup[]) => void
): () => void {
  return onSnapshot(
    buildGroupExpenseGroupsQuery(groupId, userId),
    (snapshot) => {
      onExpenseGroups(
        sortExpenseGroups(
          snapshot.docs.map((entry) =>
            parseExpenseGroup(entry.id, entry.data() as Record<string, unknown>)
          )
        )
      );
    },
    (error) => {
      console.warn(
        `[expenseGroups] subscribeToGroupExpenseGroups (${groupId}):`,
        error.code,
        error.message
      );
      onExpenseGroups([]);
    }
  );
}

export function subscribeToExpenseGroup(
  expenseGroupId: string,
  onExpenseGroup: (expenseGroup: ExpenseGroup | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'expenseGroups', expenseGroupId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onExpenseGroup(null);
        return;
      }
      onExpenseGroup(parseExpenseGroup(snapshot.id, snapshot.data() as Record<string, unknown>));
    },
    (error) => {
      console.warn(
        `[expenseGroups] subscribeToExpenseGroup (${expenseGroupId}):`,
        error.code,
        error.message
      );
      onExpenseGroup(null);
    }
  );
}

export async function fetchExpenseGroupExpensesOnce(expenseGroupId: string): Promise<Expense[]> {
  const snapshot = await getDocs(collection(db, 'expenseGroups', expenseGroupId, 'expenses'));
  return sortExpenses(
    snapshot.docs.map((entry) =>
      parseExpense(entry.id, expenseGroupId, entry.data() as Record<string, unknown>)
    )
  );
}

export async function fetchExpenseGroupSettlementsOnce(
  expenseGroupId: string
): Promise<ExpenseSettlement[]> {
  const snapshot = await getDocs(
    collection(db, 'expenseGroups', expenseGroupId, 'settlements')
  );
  return sortSettlements(
    snapshot.docs.map((entry) =>
      parseSettlement(entry.id, expenseGroupId, entry.data() as Record<string, unknown>)
    )
  );
}

export function subscribeToExpenseGroupExpenses(
  expenseGroupId: string,
  onExpenses: (expenses: Expense[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'expenseGroups', expenseGroupId, 'expenses'),
    (snapshot) => {
      onExpenses(
        sortExpenses(
          snapshot.docs.map((entry) =>
            parseExpense(entry.id, expenseGroupId, entry.data() as Record<string, unknown>)
          )
        )
      );
    },
    (error) => {
      console.warn(
        `[expenseGroups] subscribeToExpenseGroupExpenses (${expenseGroupId}):`,
        error.code,
        error.message
      );
      onExpenses([]);
    }
  );
}

export function subscribeToExpenseGroupSettlements(
  expenseGroupId: string,
  onSettlements: (settlements: ExpenseSettlement[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'expenseGroups', expenseGroupId, 'settlements'),
    (snapshot) => {
      onSettlements(
        sortSettlements(
          snapshot.docs.map((entry) =>
            parseSettlement(entry.id, expenseGroupId, entry.data() as Record<string, unknown>)
          )
        )
      );
    },
    (error) => {
      console.warn(
        `[expenseGroups] subscribeToExpenseGroupSettlements (${expenseGroupId}):`,
        error.code,
        error.message
      );
      onSettlements([]);
    }
  );
}

export async function deleteExpenseGroup(
  expenseGroup: ExpenseGroup,
  requesterId: string
): Promise<void> {
  const group = await getGroup(expenseGroup.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  const trip = expenseGroup.tripId ? await getTrip(expenseGroup.tripId) : null;
  if (!canDeleteExpenseGroup(expenseGroup, group, requesterId, trip)) {
    throw new Error('You do not have permission to delete this expense group');
  }
  if (expenseGroup.isDefault) {
    throw new Error('The group expense bucket cannot be deleted');
  }

  if (expenseGroup.tripId) {
    await notifyTripExpenseGroupDeleted(expenseGroup, trip, requesterId);
  }

  await deleteExpenseGroupRecords(expenseGroup.id);

  if (expenseGroup.tripId) {
    const linkedTrip = await getTrip(expenseGroup.tripId);
    if (linkedTrip?.expenseGroupId === expenseGroup.id) {
      try {
        await unlinkExpenseGroupFromTrip(expenseGroup.tripId);
      } catch (error) {
        console.warn(
          `[expenseGroups] deleteExpenseGroup (${expenseGroup.tripId}): unlink failed`,
          error
        );
      }
    }
  }
}

async function deleteExpenseGroupRecords(expenseGroupId: string): Promise<void> {
  const expensesSnap = await getDocs(collection(db, 'expenseGroups', expenseGroupId, 'expenses'));
  const settlementsSnap = await getDocs(
    collection(db, 'expenseGroups', expenseGroupId, 'settlements')
  );
  await Promise.all([
    ...expensesSnap.docs.map((entry) => deleteDoc(entry.ref)),
    ...settlementsSnap.docs.map((entry) => deleteDoc(entry.ref)),
  ]);
  await deleteDoc(doc(db, 'expenseGroups', expenseGroupId));
}

/** Deletes all expense groups (and their expenses/settlements) for a household group. */
export async function deleteExpenseGroupsForGroup(groupId: string): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, 'expenseGroups'), where('groupId', '==', groupId))
  );
  await Promise.all(snapshot.docs.map((entry) => deleteExpenseGroupRecords(entry.id)));
}

/** Deletes the expense group linked to a trip, if one exists. */
export async function deleteTripLinkedExpenseGroup(
  trip: Pick<Trip, 'id' | 'groupId' | 'expenseGroupId'>
): Promise<void> {
  let expenseGroupId = trip.expenseGroupId ?? null;

  if (!expenseGroupId) {
    const snapshot = await getDocs(
      query(
        collection(db, 'expenseGroups'),
        where('groupId', '==', trip.groupId),
        where('tripId', '==', trip.id),
        limit(1)
      )
    );
    expenseGroupId = snapshot.docs[0]?.id ?? null;
  }

  if (!expenseGroupId) return;

  await deleteExpenseGroupRecords(expenseGroupId);
}

export async function addExpense(
  expenseGroup: ExpenseGroup,
  input: ExpenseInput,
  userId: string
): Promise<string> {
  const group = await getGroup(expenseGroup.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  const trip = await getTripForExpenseGroup(expenseGroup);
  if (!canEditExpenseGroup(expenseGroup, group, userId, trip)) {
    throw new Error('You do not have access to this expense group');
  }

  const normalized = validateExpenseInput(input, expenseGroup.memberIds);
  const id = doc(collection(db, 'expenseGroups', expenseGroup.id, 'expenses')).id;
  const now = new Date().toISOString();

  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id, 'expenses', id),
    stripUndefined({
      description: normalized.description,
      amountCents: normalized.amountCents,
      paidByUserId: normalized.paidByUserId,
      splitAmongUserIds: normalized.splitAmongUserIds,
      splitMode: normalized.splitMode === 'equal' ? undefined : normalized.splitMode,
      splitValues: normalized.splitValues,
      expenseDate: normalized.expenseDate,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  );

  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id),
    stripUndefined({ updatedAt: now }),
    { merge: true }
  );

  const expense: Expense = {
    id,
    expenseGroupId: expenseGroup.id,
    description: normalized.description,
    amountCents: normalized.amountCents,
    paidByUserId: normalized.paidByUserId,
    splitAmongUserIds: normalized.splitAmongUserIds,
    splitMode: normalized.splitMode,
    splitValues: normalized.splitValues,
    expenseDate: normalized.expenseDate,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  await notifyExpenseCreated(expenseGroup, expense, userId, trip);

  return id;
}

export async function updateExpense(
  expenseGroup: ExpenseGroup,
  expenseId: string,
  input: ExpenseInput,
  userId: string
): Promise<void> {
  const group = await getGroup(expenseGroup.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  const trip = await getTripForExpenseGroup(expenseGroup);
  if (!canEditExpenseGroup(expenseGroup, group, userId, trip)) {
    throw new Error('You do not have access to this expense group');
  }

  const expenseRef = doc(db, 'expenseGroups', expenseGroup.id, 'expenses', expenseId);
  const existingSnap = await getDoc(expenseRef);
  if (!existingSnap.exists()) {
    throw new Error('Expense not found');
  }

  const before = parseExpense(expenseId, expenseGroup.id, existingSnap.data() as Record<string, unknown>);
  const normalized = validateExpenseInput(input, expenseGroup.memberIds);
  const now = new Date().toISOString();
  const existing = existingSnap.data();

  const expenseData: Record<string, unknown> = stripUndefined({
    description: normalized.description,
    amountCents: normalized.amountCents,
    paidByUserId: normalized.paidByUserId,
    splitAmongUserIds: normalized.splitAmongUserIds,
    splitMode: normalized.splitMode === 'equal' ? undefined : normalized.splitMode,
    splitValues: normalized.splitValues,
    expenseDate: normalized.expenseDate,
    createdBy: existing.createdBy,
    createdAt: existing.createdAt,
    updatedAt: now,
  });
  if (normalized.splitMode === 'equal') {
    expenseData.splitMode = deleteField();
    expenseData.splitValues = deleteField();
  }

  await setDoc(expenseRef, expenseData, { merge: true });

  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id),
    { updatedAt: now },
    { merge: true }
  );

  await notifyExpenseUpdated(expenseGroup, before, normalized, userId, trip);
}

export async function deleteExpense(
  expenseGroup: ExpenseGroup,
  expenseId: string,
  userId: string
): Promise<void> {
  const group = await getGroup(expenseGroup.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  const trip = await getTripForExpenseGroup(expenseGroup);
  if (!canEditExpenseGroup(expenseGroup, group, userId, trip)) {
    throw new Error('You do not have access to this expense group');
  }

  const expenseRef = doc(db, 'expenseGroups', expenseGroup.id, 'expenses', expenseId);
  const existingSnap = await getDoc(expenseRef);
  if (!existingSnap.exists()) {
    throw new Error('Expense not found');
  }
  const expense = parseExpense(
    expenseId,
    expenseGroup.id,
    existingSnap.data() as Record<string, unknown>
  );

  await deleteDoc(expenseRef);
  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id),
    { updatedAt: new Date().toISOString() },
    { merge: true }
  );

  await notifyExpenseDeleted(expenseGroup, expense, userId, trip);
}

export async function addSettlement(
  expenseGroup: ExpenseGroup,
  input: ExpenseSettlementInput,
  userId: string
): Promise<string> {
  const group = await getGroup(expenseGroup.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  const trip = await getTripForExpenseGroup(expenseGroup);
  if (!canViewExpenseGroup(expenseGroup, group, userId, trip)) {
    throw new Error('You do not have access to this expense group');
  }

  const normalized = validateSettlementInput(input, expenseGroup.memberIds);
  const id = doc(collection(db, 'expenseGroups', expenseGroup.id, 'settlements')).id;
  const now = new Date().toISOString();

  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id, 'settlements', id),
    stripUndefined({
      expenseId: normalized.expenseId,
      fromUserId: normalized.fromUserId,
      toUserId: normalized.toUserId,
      amountCents: normalized.amountCents,
      settlementDate: normalized.settlementDate,
      note: normalized.note,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  );

  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id),
    { updatedAt: now },
    { merge: true }
  );

  const settlement: ExpenseSettlement = {
    id,
    expenseGroupId: expenseGroup.id,
    expenseId: normalized.expenseId,
    fromUserId: normalized.fromUserId,
    toUserId: normalized.toUserId,
    amountCents: normalized.amountCents,
    settlementDate: normalized.settlementDate,
    note: normalized.note,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  await notifyExpenseSettlementAdded(expenseGroup, settlement, userId, trip);

  return id;
}

export async function deleteSettlement(
  expenseGroup: ExpenseGroup,
  settlementId: string,
  userId: string
): Promise<void> {
  const group = await getGroup(expenseGroup.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  const trip = await getTripForExpenseGroup(expenseGroup);
  if (!canEditExpenseGroup(expenseGroup, group, userId, trip)) {
    throw new Error('You do not have access to this expense group');
  }

  const settlementRef = doc(db, 'expenseGroups', expenseGroup.id, 'settlements', settlementId);
  const existingSnap = await getDoc(settlementRef);
  if (!existingSnap.exists()) {
    throw new Error('Settlement not found');
  }
  const settlement = parseSettlement(
    settlementId,
    expenseGroup.id,
    existingSnap.data() as Record<string, unknown>
  );

  await deleteDoc(settlementRef);
  await setDoc(
    doc(db, 'expenseGroups', expenseGroup.id),
    { updatedAt: new Date().toISOString() },
    { merge: true }
  );

  await notifyExpenseSettlementRemoved(expenseGroup, settlement, userId, trip);
}
