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
} from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { db } from '../config/firebase';
import { Group, GroupInvite } from '../types';
import { deleteItemsForGroup } from './items';
import { cancelGroupBilling } from './billing';

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

export function buildInviteLink(inviteCode: string): string {
  return Linking.createURL('join', { queryParams: { code: inviteCode } });
}

export function buildInviteMessage(group: Group): string {
  const link = buildInviteLink(group.inviteCode);
  return `Join "${group.name}" on Lyvee!\n\nInvite code: ${group.inviteCode}\n\nOr open: ${link}`;
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
    members: [ownerId],
    inviteCode: generateInviteCode(),
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'groups', id), group);
  await saveInviteMapping(group);
  return group;
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

  return groupSnap.data() as Group;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snapshot = await getDoc(doc(db, 'groups', groupId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as Group;
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
      const groups = snapshot.docs.map((d) => d.data() as Group);
      callback(groups.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.warn('[groups] subscribeToUserGroups:', error.code, error.message);
      callback([]);
    }
  );
}

export function subscribeToGroup(
  groupId: string,
  callback: (group: Group | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as Group) : null);
    },
    (error) => {
      console.warn('[groups] subscribeToGroup:', error.code, error.message);
      callback(null);
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
    throw new Error('Group owners cannot leave. Delete the group instead.');
  }
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayRemove(userId),
  });
}

export async function updateGroupName(
  groupId: string,
  name: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');

  const trimmed = name.trim();
  await updateDoc(doc(db, 'groups', groupId), { name: trimmed });
  await setDoc(
    doc(db, 'invites', group.inviteCode),
    { groupName: trimmed },
    { merge: true }
  );
}

export async function removeMember(
  groupId: string,
  memberId: string,
  requesterId: string
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (group.ownerId !== requesterId) {
    throw new Error('Only the group owner can remove members');
  }
  if (memberId === group.ownerId) {
    throw new Error('Cannot remove the group owner');
  }
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayRemove(memberId),
  });
}

export async function regenerateInviteCode(
  groupId: string,
  requesterId: string
): Promise<Group> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (group.ownerId !== requesterId) {
    throw new Error('Only the group owner can regenerate the invite code');
  }

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
  if (group.ownerId !== requesterId) {
    throw new Error('Only the group owner can delete the group');
  }

  await deleteItemsForGroup(groupId);
  await cancelGroupBilling(groupId, requesterId);
  await deleteDoc(doc(db, 'invites', group.inviteCode));
  await deleteDoc(doc(db, 'groups', groupId));
}

export function isGroupOwner(group: Group, userId: string): boolean {
  return group.ownerId === userId;
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
