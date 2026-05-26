import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ItemType } from '../types';
import { ItemTypeFilter } from '../utils/itemFilters';
import { colors, itemTypeConfig, radius, spacing } from '../constants/theme';
import { HorizontalChipRow } from './HorizontalChipRow';
import { TagFilterBar } from './TagFilterBar';

const TYPE_FILTERS: ItemTypeFilter[] = ['all', 'task', 'activity', 'document'];

interface ItemTypeFiltersBarProps {
  type: ItemTypeFilter;
  onTypeChange: (type: ItemTypeFilter) => void;
  availableTags?: string[];
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  selectedColor?: string;
  selectedBackground?: string;
}

function getTypeFilterColor(filter: ItemTypeFilter): string {
  if (filter === 'all') return colors.primary;
  return itemTypeConfig[filter].color;
}

function FilterChip({
  label,
  selected,
  onPress,
  selectedColor,
  selectedBackground,
}: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        selected && selectedBackground ? { backgroundColor: selectedBackground } : null,
        selected && selectedColor ? { borderColor: selectedColor } : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          selected && selectedColor ? { color: selectedColor } : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ItemTypeFiltersBar({
  type,
  onTypeChange,
  availableTags = [],
  selectedTags = [],
  onTagsChange,
}: ItemTypeFiltersBarProps) {
  const showClear = type !== 'all' || selectedTags.length > 0;

  const handleClear = () => {
    onTypeChange('all');
    onTagsChange?.([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Filters</Text>
        {showClear && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Type</Text>
      <HorizontalChipRow style={styles.chipRow}>
        {TYPE_FILTERS.map((typeFilter) => {
          const selected = type === typeFilter;
          const typeColor = getTypeFilterColor(typeFilter);
          const label =
            typeFilter === 'all' ? 'All' : itemTypeConfig[typeFilter as ItemType].label;

          return (
            <FilterChip
              key={typeFilter}
              label={label}
              selected={selected}
              onPress={() => onTypeChange(typeFilter)}
              selectedColor={typeColor}
              selectedBackground={typeColor + '20'}
            />
          );
        })}
      </HorizontalChipRow>

      {onTagsChange && availableTags.length > 0 && (
        <TagFilterBar
          availableTags={availableTags}
          selectedTags={selectedTags}
          onChange={onTagsChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clear: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  chipRow: {
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
