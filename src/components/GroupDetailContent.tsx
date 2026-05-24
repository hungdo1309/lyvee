import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Button } from './Button';
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
  isGroupOwner,
  ensureGroupInvite,
} from '../services/groups';
import { colors, spacing, radius, typography } from '../constants/theme';
import { Group } from '../types';

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

  const { members, loading: membersLoading } = useGroupMembers(group?.members ?? []);
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

  const owner = isGroupOwner(group, user.id);
  const memberCount = Math.max(members.length, group.members.length);

  const handleShareInvite = async () => {
    await Share.share({ message: buildInviteMessage(group) });
  };

  const handleRegenerateCode = () => {
    Alert.alert(
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
              Alert.alert('Done', 'A new invite code has been generated.');
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert('Remove member', `Remove ${memberName} from "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(group.id, memberId, user.id);
          } catch (error: unknown) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed');
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert(
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
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Are you sure you want to proceed?',
      'This will permanently delete the group, remove all members, delete all items, and cancel billing for this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete group',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteGroup(group.id, user.id);
              onDelete?.();
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed');
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members ({memberCount})</Text>

        <View style={styles.addMemberBlock}>
          <Text style={styles.addMemberHint}>
            Share the invite code so others can join this group.
          </Text>
          <TouchableOpacity style={styles.inviteCard} onPress={handleShareInvite}>
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            <Text style={styles.inviteHint}>Tap to share code & link</Text>
          </TouchableOpacity>
          {owner && (
            <Button
              title="Regenerate code"
              variant="secondary"
              onPress={handleRegenerateCode}
              loading={submitting}
              style={styles.regenerateButton}
            />
          )}
        </View>

        {membersLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.membersLoading} />
        ) : members.length === 0 ? (
          <Text style={styles.emptyText}>
            {group.members.length > 0
              ? 'Member profiles could not be loaded.'
              : 'No members yet.'}
          </Text>
        ) : (
          members.map((member) => {
            const isMemberOwner = member.id === group.ownerId;
            return (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.name}
                    {member.id === user.id ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                {owner && !isMemberOwner && member.id !== user.id && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member.id, member.name)}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                )}
                {isMemberOwner && <Text style={styles.ownerBadge}>Owner</Text>}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <Text style={styles.countText}>{itemCountLabel}</Text>
      </View>

      {!owner ? (
        <Button title="Leave group" variant="danger" onPress={handleLeave} />
      ) : (
        <View style={styles.ownerActions}>
          <Text style={styles.ownerDeleteHint}>
            As the owner, you cannot leave this group. Delete it to remove all members
            and cancel billing.
          </Text>
          <Button
            title="Delete group"
            variant="danger"
            onPress={handleDeleteGroup}
            loading={submitting}
          />
        </View>
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
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  removeText: {
    color: colors.error,
    fontWeight: '500',
    fontSize: 14,
  },
  ownerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
