import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { formatTagLabel, getTagStyle } from '../utils/tags';
import { colors, radius, spacing } from '../constants/theme';
import { HorizontalChipRow } from './HorizontalChipRow';

interface TagFilterBarProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  onClear?: () => void;
}

export function TagFilterBar({
  availableTags,
  selectedTags,
  onChange,
  onClear,
}: TagFilterBarProps) {
  if (availableTags.length === 0) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Tags</Text>
        {selectedTags.length > 0 && onClear && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <HorizontalChipRow>
        {availableTags.map((tag) => {
          const selected = selectedTags.includes(tag);
          const tagStyle = getTagStyle(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? tagStyle.backgroundColor : colors.surface,
                  borderColor: selected ? tagStyle.color : colors.border,
                },
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? tagStyle.color : colors.textSecondary },
                  selected && styles.chipTextSelected,
                ]}
              >
                {formatTagLabel(tag)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </HorizontalChipRow>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  clear: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  chipTextSelected: {
    fontWeight: '600',
  },
});
