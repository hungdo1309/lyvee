import { Group } from '../types';
import { enqueuePushEvent } from './pushNotifications';
import { getOtherGroupManagers, getOtherGroupMembers } from '../utils/pushRecipients';
import { getUserProfile } from './auth';

async function actorName(actorId: string): Promise<string> {
  const profile = await getUserProfile(actorId);
  return profile?.name ?? 'Someone';
}

export async function notifyGroupMemberJoined(
  group: Group,
  joinerId: string
): Promise<void> {
  const name = await actorName(joinerId);
  await enqueuePushEvent({
    type: 'group.member_joined',
    actorId: joinerId,
    actorName: name,
    recipientIds: getOtherGroupManagers(group, joinerId),
    title: group.name,
    body: `${name} joined your group.`,
    data: { type: 'group.member_joined', groupId: group.id },
  });
}

export async function notifyGroupMemberLeft(
  group: Group,
  memberId: string
): Promise<void> {
  const name = await actorName(memberId);
  await enqueuePushEvent({
    type: 'group.member_left',
    actorId: memberId,
    actorName: name,
    recipientIds: getOtherGroupManagers(group, memberId),
    title: group.name,
    body: `${name} left the group.`,
    data: { type: 'group.member_left', groupId: group.id },
  });
}

export async function notifyGroupMemberRemoved(
  group: Group,
  removedMemberId: string,
  actorId: string
): Promise<void> {
  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'group.member_removed',
    actorId,
    actorName: name,
    recipientIds: [removedMemberId],
    title: group.name,
    body: `${name} removed you from the group.`,
    data: { type: 'group.member_removed', groupId: group.id },
  });
}

export async function notifyGroupRolePromoted(
  group: Group,
  memberId: string,
  actorId: string
): Promise<void> {
  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'group.role_promoted',
    actorId,
    actorName: name,
    recipientIds: [memberId],
    title: group.name,
    body: `${name} made you an admin.`,
    data: { type: 'group.role_promoted', groupId: group.id },
  });
}

export async function notifyGroupRoleDemoted(
  group: Group,
  memberId: string,
  actorId: string
): Promise<void> {
  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'group.role_demoted',
    actorId,
    actorName: name,
    recipientIds: [memberId],
    title: group.name,
    body: `${name} changed your role to member.`,
    data: { type: 'group.role_demoted', groupId: group.id },
  });
}

export async function notifyGroupOwnershipTransferred(
  group: Group,
  newOwnerId: string,
  actorId: string
): Promise<void> {
  const name = await actorName(actorId);
  if (actorId !== newOwnerId) {
    await enqueuePushEvent({
      type: 'group.ownership_transferred',
      actorId,
      actorName: name,
      recipientIds: [newOwnerId],
      title: group.name,
      body: `${name} made you the group owner.`,
      data: { type: 'group.ownership_transferred', groupId: group.id },
    });
  }
}

export async function notifyGroupRenamed(
  group: Group,
  previousName: string,
  actorId: string
): Promise<void> {
  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'group.renamed',
    actorId,
    actorName: name,
    recipientIds: getOtherGroupMembers(group, actorId),
    title: 'Group renamed',
    body: `${name} renamed "${previousName}" to "${group.name}".`,
    data: { type: 'group.renamed', groupId: group.id },
  });
}

export async function notifyGroupDeleted(
  group: Group,
  actorId: string
): Promise<void> {
  const name = await actorName(actorId);
  await enqueuePushEvent({
    type: 'group.deleted',
    actorId,
    actorName: name,
    recipientIds: getOtherGroupMembers(group, actorId),
    title: 'Group deleted',
    body: `${name} deleted "${group.name}".`,
    data: { type: 'group.deleted', groupId: group.id },
  });
}
