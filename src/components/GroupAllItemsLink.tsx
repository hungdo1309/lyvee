import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../constants/theme';
import { formatButtonLabel } from '../utils/strings';

interface GroupAllItemsLinkProps {
  groupId: string;
  variant?: 'card' | 'inline';
}

export function GroupAllItemsLink({ groupId, variant = 'card' }: GroupAllItemsLinkProps) {
  const label = formatButtonLabel('View all items');

  return (
    <TouchableOpacity
      style={[styles.link, variant === 'inline' && styles.linkInline]}
      onPress={() =>
        router.push({
          pathname: '/(app)/group/[groupId]/items',
          params: { groupId },
        })
      }
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  linkInline: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
