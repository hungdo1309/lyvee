import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { db } from '../config/firebase';
import { APP_NAME } from '../constants/app';
import { Group, GroupInvite } from '../types';
import {
  canManageGroup,
  getGroupAdminIds,
  isGroupAdmin,
  isGroupOwner,
  normalizeGroup,
} from '../utils/groupRoles';
import { cancelGroupBilling } from './billing';
import { getGroup } from './groupLookup';
import {
  notifyGroupDeleted,
  notifyGroupMemberJoined,
  notifyGroupMemberLeft,
  notifyGroupMemberRemoved,
  notifyGroupOwnershipTransferred,
  notifyGroupRenamed,
  notifyGroupRoleDemoted,
  notifyGroupRolePromoted,
} from './groupNotifications';

export { isGroupOwner, isGroupAdmin, canManageGroup, canDeleteGroup } from '../utils/groupRoles';
export { getGroup } from './groupLookup';

async function ensureDefaultGroupExpenseForMember(
  userId: string,
  groupId: string
): Promise<void> {
  const { ensureDefaultGroupExpenseGroup } = await import('./expenseGroups');
  await ensureDefaultGroupExpenseGroup(userId, groupId);
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function saveInviteMapping(group: Group): Promise<void> {
  const invite: GroupInvite = {
    groupId: group.id,
    groupName: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt,
  };
  await setDoc(doc(db, 'invites', group.inviteCode), invite);
}

function assertCanManageGroup(group: Group, requesterId: string, action: string): void {
  if (!canManageGroup(group, requesterId)) {
    throw new Error(`Only the group owner or an admin can ${action}`);
  }
}

export function buildInviteLink(inviteCode: string): string {
  return Linking.createURL('join', { queryParams: { code: inviteCode } });
}

export function buildInviteMessage(group: Group): string {
  const link = buildInviteLink(group.inviteCode);
  return `Join "${group.name}" on ${APP_NAME}!\n\nInvite code: ${group.inviteCode}\n\nOr open: ${link}`;
}

export async function createGroup(
  name: string,
  ownerId: string
): Promise<Group> {
  const id = doc(collection(db, 'groups')).id;
  const group: Group = {
    id,
    name: name.trim(),
    ownerId,
    adminIds: [],
    members: [ownerId],
    inviteCode: generateInviteCode(),
    createdAt: new Date().toISOString(),
    visibleToMigrated: true,
  };
  await setDoc(doc(db, 'groups', id), group);
  await saveInviteMapping(group);
  await ensureDefaultGroupExpenseForMember(ownerId, id);
  return group;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  return getGroup(groupId);
}

export async function joinGroupByInviteCode(
  inviteCode: string,
  userId: string
): Promise<Group> {
  const normalized = inviteCode.trim().toUpperCase();
  const inviteSnap = await getDoc(doc(db, 'invites', normalized));

  if (!inviteSnap.exists()) {
    throw new Error('Invalid invite code');
  }

  const invite = inviteSnap.data() as GroupInvite;

  await updateDoc(doc(db, 'groups', invite.groupId), {
    members: arrayUnion(userId),
  });

  const groupSnap = await getDoc(doc(db, 'groups', invite.groupId));
  if (!groupSnap.exists()) {
    throw new Error('Group no longer exists');
  }

  const group = normalizeGroup(groupSnap.data() as Group);
  await notifyGroupMemberJoined(group, userId);
  await ensureDefaultGroupExpenseForMember(userId, group.id);
  return group;
}

export function subscribeToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void
): () => void {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const groups = snapshot.docs.map((d) => normalizeGroup(d.data() as Group));
      callback(groups.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.warn('[groups] subscribeToUserGroups:', error.code, error.message);
      callback([]);
    }
  );
}

export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (group.ownerId === userId) {
    throw new Error('Group owners cannot leave. Transfer ownership or delete the group.');
  }

  const updates: Record<string, ReturnType<typeof arrayRemove>> = {
    members: arrayRemove(userId),
  };
  if (getGroupAdminIds(group).includes(userId)) {
    updates.adminIds = arrayRemove(userId);
  }

  await updateDoc(doc(db, 'groups', groupId), updates);
  await notifyGroupMemberLeft(group, userId);
}

export async function updateGroupName(
  groupId: string,
  name: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  assertCanManageGroup(group, requesterId, 'rename the group');

  const trimmed = name.trim();
  if (!trimmed) throw new Error('Group name is required');
  if (trimmed === group.name) return;

  await updateDoc(doc(db, 'groups', groupId), { name: trimmed });
  await setDoc(
    doc(db, 'invites', group.inviteCode),
    { groupName: trimmed },
    { merge: true }
  );
  await notifyGroupRenamed({ ...group, name: trimmed }, group.name, requesterId);
}

export async function transferGroupOwnership(
  groupId: string,
  newOwnerId: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (!isGroupOwner(group, requesterId)) {
    throw new Error('Only the group owner can transfer ownership');
  }
  if (newOwnerId === requesterId) {
    throw new Error('You are already the group owner');
  }
  if (!group.members.includes(newOwnerId)) {
    throw new Error('The new owner must be a member of this group');
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'groups', groupId), {
    ownerId: newOwnerId,
    adminIds: arrayRemove(newOwnerId),
  });
  batch.update(doc(db, 'invites', group.inviteCode), { ownerId: newOwnerId });
  await batch.commit();
  await notifyGroupOwnershipTransferred(group, newOwnerId, requesterId);
}

export async function promoteMemberToAdmin(
  groupId: string,
  memberId: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  assertCanManageGroup(group, requesterId, 'change member roles');

  if (!group.members.includes(memberId)) {
    throw new Error('That user is not in this group');
  }
  if (memberId === group.ownerId) {
    throw new Error('The owner already has full access');
  }
  if (getGroupAdminIds(group).includes(memberId)) {
    return;
  }

  await updateDoc(doc(db, 'groups', groupId), {
    adminIds: arrayUnion(memberId),
  });
  await notifyGroupRolePromoted(group, memberId, requesterId);
}

export async function demoteAdminToMember(
  groupId: string,
  memberId: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (!isGroupOwner(group, requesterId)) {
    throw new Error('Only the group owner can remove admin access');
  }
  if (!getGroupAdminIds(group).includes(memberId)) {
    return;
  }

  await updateDoc(doc(db, 'groups', groupId), {
    adminIds: arrayRemove(memberId),
  });
  await notifyGroupRoleDemoted(group, memberId, requesterId);
}

export async function removeMember(
  groupId: string,
  memberId: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  assertCanManageGroup(group, requesterId, 'remove members');

  if (memberId === group.ownerId) {
    throw new Error('Cannot remove the group owner');
  }
  if (memberId === requesterId) {
    throw new Error('Use leave group to remove yourself');
  }
  if (isGroupAdmin(group, requesterId) && !isGroupOwner(group, requesterId)) {
    if (getGroupAdminIds(group).includes(memberId)) {
      throw new Error('Admins can only remove regular members');
    }
  }

  const updates: Record<string, ReturnType<typeof arrayRemove>> = {
    members: arrayRemove(memberId),
  };
  if (getGroupAdminIds(group).includes(memberId)) {
    updates.adminIds = arrayRemove(memberId);
  }

  await updateDoc(doc(db, 'groups', groupId), updates);
  await notifyGroupMemberRemoved(group, memberId, requesterId);
}

export async function regenerateInviteCode(
  groupId: string,
  requesterId: string
): Promise<Group> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  assertCanManageGroup(group, requesterId, 'regenerate the invite code');

  const oldCode = group.inviteCode;
  const newCode = generateInviteCode();
  const updated: Group = { ...group, inviteCode: newCode };

  await updateDoc(doc(db, 'groups', groupId), { inviteCode: newCode });
  await deleteDoc(doc(db, 'invites', oldCode));
  await saveInviteMapping(updated);

  return updated;
}

export async function deleteGroup(
  groupId: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (!isGroupOwner(group, requesterId)) {
    throw new Error('Only the group owner can delete the group');
  }

  await notifyGroupDeleted(group, requesterId);
  await cancelGroupBilling(groupId, requesterId);
  // Invite goes first while the group still exists (rules require the owner).
  // Items, trips, comments, and expense buckets — including the default one —
  // are wiped by the cleanupDeletedGroup function after this delete. Those
  // records stay individually protected.
  await deleteDoc(doc(db, 'invites', group.inviteCode));
  await deleteDoc(doc(db, 'groups', groupId));
}

export function isGroupMember(group: Group, userId: string): boolean {
  return group.members.includes(userId);
}

export async function ensureGroupInvite(group: Group): Promise<void> {
  const snap = await getDoc(doc(db, 'invites', group.inviteCode));
  if (!snap.exists()) {
    await saveInviteMapping(group);
  }
}
