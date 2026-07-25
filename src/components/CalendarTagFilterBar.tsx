import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { formatTagLabel, getTagStyle } from '../utils/tags';
import { colors, radius, spacing } from '../constants/theme';
import { HorizontalChipRow } from './HorizontalChipRow';

interface CalendarTagFilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function CalendarTagFilterBar({
  tags,
  selectedTag,
  onSelect,
}: CalendarTagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <HorizontalChipRow style={styles.container}>
      <TouchableOpacity
        style={[styles.chip, selectedTag === null && styles.chipSelected]}
        onPress={() => onSelect(null)}
      >
        <Text
          style={[
            styles.chipText,
            selectedTag === null && styles.chipTextSelected,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      {tags.map((tag) => {
        const selected = selectedTag === tag;
        const tagStyle = getTagStyle(tag);
        return (
          <TouchableOpacity
            key={tag}
            style={[
              styles.chip,
              selected
                ? {
                    backgroundColor: tagStyle.backgroundColor,
                    borderColor: tagStyle.color,
                  }
                : styles.chipDefault,
            ]}
            onPress={() => onSelect(tag)}
          >
            <Text
              style={[
                styles.chipText,
                selected
                  ? { color: tagStyle.color, fontWeight: '600' }
                  : styles.chipTextDefault,
              ]}
            >
              {formatTagLabel(tag)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </HorizontalChipRow>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  chipDefault: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  chipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  chipTextDefault: {
    color: colors.textSecondary,
  },
});
