import { Group, GroupMemberRole } from '../types';

export type MemberAction = 'remove' | 'makeAdmin' | 'makeMember' | 'makeOwner';

export function getGroupAdminIds(group: Group): string[] {
  return group.adminIds ?? [];
}

export function normalizeGroup(group: Group): Group {
  const adminIds = getGroupAdminIds(group).filter((id) => id !== group.ownerId);
  return { ...group, adminIds };
}

export function getMemberRole(group: Group, userId: string): GroupMemberRole {
  if (group.ownerId === userId) return 'owner';
  if (getGroupAdminIds(group).includes(userId)) return 'admin';
  return 'member';
}

export function getRoleLabel(role: GroupMemberRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    default:
      return 'Member';
  }
}

export function isGroupOwner(group: Group, userId: string): boolean {
  return group.ownerId === userId;
}

export function isGroupAdmin(group: Group, userId: string): boolean {
  return getGroupAdminIds(group).includes(userId);
}

export function canManageGroup(group: Group, userId: string): boolean {
  return isGroupOwner(group, userId) || isGroupAdmin(group, userId);
}

export function canDeleteGroup(group: Group, userId: string): boolean {
  return isGroupOwner(group, userId);
}

export function getMemberActions(
  group: Group,
  actorId: string,
  targetId: string
): MemberAction[] {
  if (actorId === targetId) return [];

  const actorRole = getMemberRole(group, actorId);
  const targetRole = getMemberRole(group, targetId);

  if (actorRole === 'member') return [];

  if (actorRole === 'admin') {
    if (targetRole === 'member') return ['remove', 'makeAdmin'];
    return [];
  }

  if (targetRole === 'owner') return [];
  if (targetRole === 'admin') return ['remove', 'makeMember'];
  return ['remove', 'makeAdmin', 'makeOwner'];
}

export function getMemberActionLabel(action: MemberAction): string {
  switch (action) {
    case 'remove':
      return 'Remove';
    case 'makeAdmin':
      return 'Make admin';
    case 'makeMember':
      return 'Make member';
    case 'makeOwner':
      return 'Make owner';
  }
}

export function getRoleAssignmentActions(actions: MemberAction[]): MemberAction[] {
  return actions.filter((action) => action !== 'remove');
}

export function getRoleOptionLabel(action: MemberAction): string {
  switch (action) {
    case 'makeAdmin':
      return 'Admin';
    case 'makeMember':
      return 'Member';
    case 'makeOwner':
      return 'Owner';
    default:
      return getMemberActionLabel(action);
  }
}

export function sortMembersByRole<T extends { id: string; name: string }>(
  group: Group,
  members: T[]
): T[] {
  const rank = (userId: string) => {
    const role = getMemberRole(group, userId);
    if (role === 'owner') return 0;
    if (role === 'admin') return 1;
    return 2;
  };

  return [...members].sort((a, b) => {
    const rankDiff = rank(a.id) - rank(b.id);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });
}
