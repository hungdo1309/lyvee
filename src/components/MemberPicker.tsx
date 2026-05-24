import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { User } from '../types';
import { colors, radius, spacing } from '../constants/theme';
import { getFirstName, getNameInitials } from '../utils/names';

interface MemberPickerProps {
  members: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  emptyMessage?: string;
}

export function MemberPicker({
  members,
  selectedIds,
  onChange,
  label = 'Who can see this',
  emptyMessage = 'No members in this group yet.',
}: MemberPickerProps) {
  const toggleMember = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  };

  if (members.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {members.map((member) => {
          const selected = selectedIds.includes(member.id);
          return (
            <TouchableOpacity
              key={member.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleMember(member.id)}
            >
              <View style={[styles.avatar, selected && styles.avatarSelected]}>
                <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
                  {getNameInitials(member.name)}
                </Text>
              </View>
              <Text style={[styles.name, selected && styles.nameSelected]}>
                {getFirstName(member.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
  },
  chip: {
    alignItems: 'center',
    marginRight: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 72,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarSelected: {
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: -0.5,
  },
  avatarTextSelected: {
    color: '#fff',
  },
  name: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  nameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
