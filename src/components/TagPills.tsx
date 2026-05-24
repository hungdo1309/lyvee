import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatTagLabel, getTagStyle } from '../utils/tags';
import { colors, radius, spacing } from '../constants/theme';

interface TagPillsProps {
  tags: string[];
  size?: 'sm' | 'md';
  onRemove?: (tag: string) => void;
  maxVisible?: number;
}

export function TagPills({
  tags,
  size = 'sm',
  onRemove,
  maxVisible,
}: TagPillsProps) {
  if (tags.length === 0) return null;

  const visible = maxVisible ? tags.slice(0, maxVisible) : tags;
  const overflow = maxVisible ? tags.length - maxVisible : 0;
  const isSmall = size === 'sm';

  return (
    <View style={styles.row}>
      {visible.map((tag) => {
        const style = getTagStyle(tag);
        return (
          <View
            key={tag}
            style={[
              styles.pill,
              isSmall ? styles.pillSm : styles.pillMd,
              { backgroundColor: style.backgroundColor },
            ]}
          >
            <Text
              style={[
                styles.label,
                isSmall ? styles.labelSm : styles.labelMd,
                { color: style.color },
              ]}
            >
              {formatTagLabel(tag)}
            </Text>
            {onRemove && (
              <TouchableOpacity
                onPress={() => onRemove(tag)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.remove, { color: style.color }]}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      {overflow > 0 && (
        <View style={[styles.pill, isSmall ? styles.pillSm : styles.pillMd, styles.overflow]}>
          <Text style={[styles.label, isSmall ? styles.labelSm : styles.labelMd]}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
  },
  pillSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillMd: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  label: {
    fontWeight: '500',
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 13,
  },
  remove: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
    lineHeight: 18,
  },
  overflow: {
    backgroundColor: colors.iconBg,
  },
});
