import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { appAlert } from '../utils/dialog';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Button } from './Button';
import { Input } from './Input';
import { GroupMemberRow } from './GroupMemberRow';
import { useGroupMembers } from '../hooks/useGroupMembers';
import {
  countActiveItems,
  countExpiredItems,
  formatGroupItemCounts,
} from '../utils/itemInstances';
import {
  subscribeToGroup,
  buildInviteMessage,
  regenerateInviteCode,
  removeMember,
  leaveGroup,
  deleteGroup,
  updateGroupName,
  transferGroupOwnership,
  promoteMemberToAdmin,
  demoteAdminToMember,
  canManageGroup,
  canDeleteGroup,
  ensureGroupInvite,
} from '../services/groups';
import {
  getMemberActions,
  getMemberRole,
  MemberAction,
  sortMembersByRole,
} from '../utils/groupRoles';
import { colors, spacing, radius } from '../constants/theme';
import { Group, User } from '../types';

interface GroupDetailContentProps {
  groupId: string;
  onLeave?: () => void;
  onDelete?: () => void;
}

export function GroupDetailContent({
  groupId,
  onLeave,
  onDelete,
}: GroupDetailContentProps) {
  const { user } = useAuth();
  const { items } = useApp();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const unsubscribe = subscribeToGroup(groupId, (fetched) => {
      setGroup(fetched);
      setLoading(false);
      if (fetched && user) {
        ensureGroupInvite(fetched).catch(() => {});
      }
    });
    return unsubscribe;
  }, [groupId, user]);

  useEffect(() => {
    if (group) {
      setNameDraft(group.name);
    }
  }, [group?.id, group?.name]);

  const { members, loading: membersLoading } = useGroupMembers(group?.members ?? []);
  const sortedMembers = useMemo(
    () => (group ? sortMembersByRole(group, members) : members),
    [group, members]
  );
  const groupItems = useMemo(
    () => items.filter((item) => item.groupId === groupId),
    [items, groupId]
  );
  const activeItemCount = useMemo(
    () => countActiveItems(groupItems),
    [groupItems]
  );
  const expiredItemCount = useMemo(
    () => countExpiredItems(groupItems),
    [groupItems]
  );
  const itemCountLabel = formatGroupItemCounts(activeItemCount, expiredItemCount);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!group || !user) {
    return (
      <View style={styles.errorBlock}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  const manager = canManageGroup(group, user.id);
  const owner = canDeleteGroup(group, user.id);
  const memberCount = Math.max(members.length, group.members.length);

  const handleShareInvite = async () => {
    await Share.share({ message: buildInviteMessage(group) });
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      appAlert('Error', 'Group name is required');
      return;
    }
    if (trimmed === group.name) return;

    setRenaming(true);
    try {
      await updateGroupName(group.id, trimmed, user.id);
    } catch (error: unknown) {
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update group name'
      );
    } finally {
      setRenaming(false);
    }
  };

  const handleRegenerateCode = () => {
    appAlert(
      'Regenerate invite code',
      'The old code will stop working. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await regenerateInviteCode(group.id, user.id);
              appAlert('Done', 'A new invite code has been generated.');
            } catch (error: unknown) {
              appAlert('Error', error instanceof Error ? error.message : 'Failed');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const runMemberAction = (action: MemberAction, member: User) => {
    if (action === 'remove') {
      appAlert(
        `Remove ${member.name}?`,
        `They'll lose access to ${group.name} and everything shared in this group.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember(group.id, member.id, user.id);
              } catch (error: unknown) {
                appAlert('Error', error instanceof Error ? error.message : 'Failed');
              }
            },
          },
        ]
      );
      return;
    }

    if (action === 'makeAdmin' || action === 'makeMember') {
      void (async () => {
        setSubmitting(true);
        try {
          if (action === 'makeAdmin') {
            await promoteMemberToAdmin(group.id, member.id, user.id);
          } else {
            await demoteAdminToMember(group.id, member.id, user.id);
          }
        } catch (error: unknown) {
          appAlert('Error', error instanceof Error ? error.message : 'Failed');
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }

    appAlert(
      'Transfer ownership',
      `Make ${member.name} the owner of "${group.name}"? You will stay in the group as a member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make owner',
          onPress: async () => {
            setSubmitting(true);
            try {
              await transferGroupOwnership(group.id, member.id, user.id);
              appAlert('Done', `${member.name} is now the group owner.`);
            } catch (error: unknown) {
              appAlert(
                'Error',
                error instanceof Error ? error.message : 'Failed to transfer ownership'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    appAlert(
      'Are you sure you want to proceed?',
      'You will leave this group and lose access to its shared items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave group',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(group.id, user.id);
              onLeave?.();
            } catch (error: unknown) {
              appAlert('Error', error instanceof Error ? error.message : 'Failed');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    appAlert(
      `Delete ${group.name}?`,
      'Everyone will lose access, and all items in this group will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteGroup(group.id, user.id);
              onDelete?.();
            } catch (error: unknown) {
              appAlert('Error', error instanceof Error ? error.message : 'Failed');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {manager ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group name</Text>
          <Input
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="e.g. Home, Family, Roommates"
            autoCapitalize="words"
          />
          <Button
            title="Save name"
            onPress={handleSaveName}
            loading={renaming}
            disabled={
              renaming || !nameDraft.trim() || nameDraft.trim() === group.name
            }
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group name</Text>
          <Text style={styles.groupNameReadOnly}>{group.name}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({memberCount})</Text>

        {manager && (
          <View style={styles.addMemberBlock}>
            <Text style={styles.addMemberHint}>
              Share the invite code so others can join this group.
            </Text>
            <TouchableOpacity style={styles.inviteCard} onPress={handleShareInvite}>
              <Text style={styles.inviteCode}>{group.inviteCode}</Text>
              <Text style={styles.inviteHint}>Tap to share code & link</Text>
            </TouchableOpacity>
            <Button
              title="Regenerate code"
              variant="secondary"
              onPress={handleRegenerateCode}
              loading={submitting}
              style={styles.regenerateButton}
            />
          </View>
        )}

        {!manager && (
          <Text style={styles.memberHint}>
            Only owners and admins can manage group settings and invite codes.
          </Text>
        )}

        {manager && sortedMembers.some(
          (member) => getMemberActions(group, user.id, member.id).length > 0
        ) && (
          <Text style={styles.memberHint}>
            Swipe left on a member, then tap the role or delete icon.
          </Text>
        )}

        {membersLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.membersLoading} />
        ) : sortedMembers.length === 0 ? (
          <Text style={styles.emptyText}>
            {group.members.length > 0
              ? 'Member profiles could not be loaded.'
              : 'No members yet.'}
          </Text>
        ) : (
          <View style={styles.memberList}>
            {sortedMembers.map((member) => (
              <GroupMemberRow
                key={member.id}
                group={group}
                member={member}
                currentUserId={user.id}
                actions={getMemberActions(group, user.id, member.id)}
                disabled={submitting}
                onAction={runMemberAction}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <Text style={styles.countText}>{itemCountLabel}</Text>
      </View>

      {owner ? (
        <View style={styles.ownerActions}>
          <Text style={styles.ownerDeleteHint}>
            As the owner, you cannot leave this group. Swipe a member left and assign
            Owner to transfer ownership, or delete the group below.
          </Text>
          <Button
            title="Delete group"
            variant="cancel"
            onPress={handleDeleteGroup}
            loading={submitting}
          />
        </View>
      ) : (
        <Button title="Leave group" variant="danger" onPress={handleLeave} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorBlock: {
    padding: spacing.md,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  countText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  groupNameReadOnly: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  addMemberBlock: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  addMemberHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  memberHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  regenerateButton: {
    alignSelf: 'stretch',
  },
  inviteCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inviteCode: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 4,
  },
  inviteHint: {
    fontSize: 13,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  membersLoading: {
    marginVertical: spacing.md,
  },
  memberList: {
    marginHorizontal: -spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  ownerActions: {
    gap: spacing.sm,
  },
  ownerDeleteHint: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
