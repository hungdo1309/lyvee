import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { User, Group } from '../types';
import { getNameInitials } from '../utils/names';
import {
  getMemberRole,
  getRoleAssignmentActions,
  getRoleLabel,
  getRoleOptionLabel,
  MemberAction,
} from '../utils/groupRoles';
import { colors, spacing } from '../constants/theme';
import { appAlert } from '../utils/dialog';

interface GroupMemberRowProps {
  group: Group;
  member: User;
  currentUserId: string;
  actions: MemberAction[];
  disabled?: boolean;
  onAction: (action: MemberAction, member: User) => void;
}

const ACTION_WIDTH = 56;
const ACTION_ICON_SIZE = 21;
const SWIPE_SNAP_THRESHOLD = 28;

export function GroupMemberRow({
  group,
  member,
  currentUserId,
  actions,
  disabled = false,
  onAction,
}: GroupMemberRowProps) {
  const swipeRef = useRef<Swipeable>(null);
  const role = getMemberRole(group, member.id);
  const roleLabel = getRoleLabel(role);
  const roleActions = getRoleAssignmentActions(actions);
  const canAssignRole = roleActions.length > 0;
  const canRemove = actions.includes('remove');

  const row = (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getNameInitials(member.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {member.name}
          {member.id === currentUserId ? ' (you)' : ''}
        </Text>
        <Text style={styles.email}>{member.email}</Text>
      </View>
      <Text
        style={[
          styles.roleBadge,
          role === 'owner' && styles.roleOwner,
          role === 'admin' && styles.roleAdmin,
        ]}
      >
        {roleLabel}
      </Text>
    </View>
  );

  if (!canAssignRole && !canRemove) {
    return row;
  }

  const closeSwipe = () => {
    swipeRef.current?.close();
  };

  const handleAssignRole = () => {
    closeSwipe();
    if (disabled || !canAssignRole) return;

    appAlert(
      'Assign role',
      `Choose a role for ${member.name}. A user can only have one role in a group.`,
      [
        ...roleActions.map((action) => ({
          text: getRoleOptionLabel(action),
          onPress: () => onAction(action, member),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemove = () => {
    closeSwipe();
    if (disabled || !canRemove) return;
    onAction('remove', member);
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <View style={styles.actionsRow}>
          {canAssignRole && (
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={handleAssignRole}
              disabled={disabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Assign role"
            >
              <MaterialCommunityIcons
                name="badge-account-outline"
                size={ACTION_ICON_SIZE}
                color={colors.onPrimary}
              />
            </TouchableOpacity>
          )}
          {canRemove && (
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={handleRemove}
              disabled={disabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Remove member"
            >
              <Ionicons name="trash-outline" size={ACTION_ICON_SIZE} color={colors.onPrimary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      overshootRight={false}
      friction={1}
      rightThreshold={SWIPE_SNAP_THRESHOLD}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-12, 12]}
    >
      {row}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.5,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  roleOwner: {
    color: colors.primary,
  },
  roleAdmin: {
    color: colors.primaryDark,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    width: ACTION_WIDTH,
    minHeight: 56,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: colors.primary,
  },
  removeButton: {
    backgroundColor: colors.error,
  },
});
