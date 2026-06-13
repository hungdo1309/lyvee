import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { User } from '../types';
import { searchGroupMembers } from '../utils/memberSearch';
import { getNameInitials } from '../utils/names';
import {
  scrollElementIntoView,
  scrollFocusedInputIntoView,
  useKeyboardFocusScroll,
  useScrollIntoView,
} from './KeyboardAwareScrollView';
import { colors, radius, spacing, typography } from '../constants/theme';

const MAX_SUGGESTIONS = 8;

interface MemberSearchAddFieldProps {
  members: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  emptyMessage?: string;
  readOnly?: boolean;
  lockedIds?: string[];
  helperText?: string;
}

function MemberChip({
  member,
  selected = false,
  locked = false,
  onPress,
}: {
  member: User;
  selected?: boolean;
  locked?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected, locked && styles.chipLocked]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityLabel={member.name}
    >
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
          {getNameInitials(member.name)}
        </Text>
      </View>
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={2}>
        {member.name.trim()}
      </Text>
    </TouchableOpacity>
  );
}

export function MemberSearchAddField({
  members,
  selectedIds,
  onChange,
  label = 'Who can see this',
  placeholder = 'Search group members to add',
  emptyMessage = 'No members in this group yet.',
  readOnly = false,
  lockedIds = [],
  helperText,
}: MemberSearchAddFieldProps) {
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const measureRef = useRef<View>(null);
  const scrollToFocus = useKeyboardFocusScroll();
  const scrollIntoView = useScrollIntoView();
  const lockedIdSet = useMemo(() => new Set(lockedIds), [lockedIds]);

  const selectedMembers = useMemo(
    () =>
      selectedIds
        .map((id) => members.find((member) => member.id === id))
        .filter((member): member is User => Boolean(member)),
    [members, selectedIds]
  );

  const suggestions = useMemo(
    () => searchGroupMembers(members, query, selectedIds).slice(0, MAX_SUGGESTIONS),
    [members, query, selectedIds]
  );

  const showSuggestions = !readOnly && query.trim().length > 0;

  const addMember = (memberId: string) => {
    if (selectedIds.includes(memberId)) return;
    onChange([...selectedIds, memberId]);
    setQuery('');
  };

  const removeMember = (memberId: string) => {
    if (lockedIdSet.has(memberId)) return;
    onChange(selectedIds.filter((id) => id !== memberId));
  };

  useEffect(() => {
    if (!showSuggestions) return;
    requestAnimationFrame(() => {
      scrollElementIntoView(scrollIntoView, measureRef.current);
    });
  }, [showSuggestions, suggestions.length, scrollIntoView]);

  const previousSelectedCountRef = useRef(selectedIds.length);
  useEffect(() => {
    if (selectedIds.length <= previousSelectedCountRef.current) {
      previousSelectedCountRef.current = selectedIds.length;
      return;
    }

    previousSelectedCountRef.current = selectedIds.length;
    requestAnimationFrame(() => {
      scrollFocusedInputIntoView(scrollToFocus, measureRef.current);
    });
  }, [selectedIds.length, scrollToFocus]);

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

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {selectedMembers.length > 0 ? (
        <View style={styles.chipGrid}>
          {selectedMembers.map((member) => {
            const locked = lockedIdSet.has(member.id);
            return (
              <MemberChip
                key={member.id}
                member={member}
                selected
                locked={locked}
                onPress={readOnly || locked ? undefined : () => removeMember(member.id)}
              />
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyHint}>No members added yet.</Text>
      )}

      {readOnly ? null : (
        <View>
          <View ref={measureRef} collapsable={false} style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              returnKeyType="search"
              onFocus={() => {
                scrollFocusedInputIntoView(scrollToFocus, measureRef.current);
              }}
            />
            {query.length > 0 ? (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {showSuggestions ? (
            suggestions.length === 0 ? (
              <Text style={styles.empty}>No matching group members.</Text>
            ) : (
              <View style={styles.chipGrid}>
                {suggestions.map((member) => (
                  <MemberChip
                    key={member.id}
                    member={member}
                    onPress={() => addMember(member.id)}
                  />
                ))}
              </View>
            )
          ) : null}
        </View>
      )}

      {readOnly && selectedMembers.length === 0 ? (
        <Text style={styles.empty}>None</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  helperText: {
    ...typography.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 88,
    maxWidth: 120,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipLocked: {
    opacity: 1,
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
    color: colors.onPrimary,
  },
  name: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    maxWidth: 104,
    textAlign: 'center',
  },
  nameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
});
