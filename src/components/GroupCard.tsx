import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { colors, radius, spacing } from '../constants/theme';

interface GroupCardProps {
  name: string;
  meta: string;
  onPress: () => void;
  expanded?: boolean;
  active?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
}

export function GroupCard({
  name,
  meta,
  onPress,
  expanded = false,
  active = false,
  selected = false,
  selectionMode = false,
}: GroupCardProps) {
  const variant = selected || active || expanded ? 'selected' : 'default';

  return (
    <Card variant={variant} onPress={onPress}>
      <View style={styles.row}>
        {selectionMode && (
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected && <View style={styles.radioInner} />}
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {!selectionMode && (
          <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        )}
        {active && !selectionMode && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Active</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm / 2,
    lineHeight: 20,
  },
  chevron: {
    fontSize: 16,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm / 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
