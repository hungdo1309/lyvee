import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { User } from '../types';
import { CalendarFilters, DEFAULT_CALENDAR_FILTERS, hasActiveCalendarFilters } from '../utils/itemFilters';
import { formatTagLabel, getTagStyle } from '../utils/tags';
import { colors, radius, spacing } from '../constants/theme';
import { HorizontalChipRow } from './HorizontalChipRow';

interface CalendarFiltersBarProps {
  members: User[];
  currentUserId?: string;
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
  availableTags?: string[];
  expiredCount?: number;
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  selectedColor?: string;
  selectedBackground?: string;
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

export function CalendarFiltersBar({
  members,
  currentUserId,
  filters,
  onChange,
  availableTags = [],
  expiredCount = 0,
}: CalendarFiltersBarProps) {
  const showClear = hasActiveCalendarFilters(filters);

  const listedMembers = useMemo(
    () => (currentUserId ? members.filter((m) => m.id !== currentUserId) : members),
    [members, currentUserId]
  );

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Filters</Text>
        {showClear && (
          <TouchableOpacity
            onPress={() => onChange(DEFAULT_CALENDAR_FILTERS)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Visibility</Text>
      <HorizontalChipRow style={styles.chipRow}>
        <FilterChip
          label="Everyone"
          selected={filters.visibilityMember === 'all'}
          onPress={() => onChange({ ...filters, visibilityMember: 'all' })}
        />
        {currentUserId && (
          <FilterChip
            label="Myself"
            selected={filters.visibilityMember === 'myself'}
            onPress={() => onChange({ ...filters, visibilityMember: 'myself' })}
          />
        )}
        {listedMembers.map((member) => (
          <FilterChip
            key={member.id}
            label={member.name}
            selected={filters.visibilityMember === member.id}
            onPress={() => onChange({ ...filters, visibilityMember: member.id })}
          />
        ))}
      </HorizontalChipRow>

      <Text style={styles.label}>Assigned to</Text>
      <HorizontalChipRow style={styles.chipRow}>
        <FilterChip
          label="Anyone"
          selected={filters.assigneeId === 'all'}
          onPress={() => onChange({ ...filters, assigneeId: 'all' })}
        />
        <FilterChip
          label="Unassigned"
          selected={filters.assigneeId === 'unassigned'}
          onPress={() => onChange({ ...filters, assigneeId: 'unassigned' })}
        />
        {members.map((member) => (
          <FilterChip
            key={`assign-${member.id}`}
            label={member.name.split(' ')[0]}
            selected={filters.assigneeId === member.id}
            onPress={() => onChange({ ...filters, assigneeId: member.id })}
          />
        ))}
      </HorizontalChipRow>

      <Text style={styles.label}>Status</Text>
      <HorizontalChipRow style={styles.chipRow}>
        <FilterChip
          label={
            filters.showExpired
              ? 'Includes Expired'
              : expiredCount > 0
                ? `Includes Expired · ${expiredCount}`
                : 'Includes Expired'
          }
          selected={filters.showExpired}
          onPress={() => onChange({ ...filters, showExpired: !filters.showExpired })}
          selectedColor={colors.textSecondary}
          selectedBackground={colors.textMuted + '20'}
        />
      </HorizontalChipRow>

      {availableTags.length > 0 && (
        <>
          <Text style={styles.label}>Tags</Text>
          <HorizontalChipRow style={styles.chipRow}>
            {availableTags.map((tag) => {
              const selected = filters.tags.includes(tag);
              const tagStyle = getTagStyle(tag);
              return (
                <FilterChip
                  key={tag}
                  label={formatTagLabel(tag)}
                  selected={selected}
                  onPress={() => toggleTag(tag)}
                  selectedColor={tagStyle.color}
                  selectedBackground={tagStyle.backgroundColor}
                />
              );
            })}
          </HorizontalChipRow>
        </>
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
