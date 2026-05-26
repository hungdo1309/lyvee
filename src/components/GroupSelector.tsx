import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Group } from '../types';
import { GroupPicker } from './GroupPicker';
import { navigateToCreateGroup } from '../utils/groupSetupNavigation';
import { colors, spacing } from '../constants/theme';

interface GroupSelectorProps {
  groups: Group[];
  activeGroup: Group | null;
  onSelect: (groupId: string) => void;
}

export function GroupSelector({
  groups,
  activeGroup,
  onSelect,
}: GroupSelectorProps) {
  if (groups.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <GroupPicker
        groupId={activeGroup?.id ?? groups[0]?.id ?? ''}
        groups={groups}
        onChange={onSelect}
        headerAction={
          <TouchableOpacity
            style={styles.manageLink}
            onPress={navigateToCreateGroup}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.manageText}>+ Groups</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  manageLink: {
    paddingVertical: spacing.xs,
  },
  manageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
