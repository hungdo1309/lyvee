import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '../constants/theme';

interface GroupPickerProps {
  groupId: string;
  groups: { id: string; name: string }[];
  onChange?: (groupId: string) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
}

const MAX_MENU_HEIGHT = 240;

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032`´']/g, "'");
}

function matchesGroupSearch(name: string, query: string): boolean {
  return normalizeForSearch(name).includes(normalizeForSearch(query));
}

export function GroupPicker({
  groupId,
  groups,
  onChange,
  readOnly = false,
  defaultOpen = false,
  headerAction,
}: GroupPickerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId) ?? groups[0],
    [groups, groupId]
  );

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return groups;
    return groups.filter((group) => matchesGroupSearch(group.name, query));
  }, [groups, searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      return;
    }

    const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  if (groups.length === 0 || !selectedGroup) return null;

  const canChange = !readOnly && groups.length > 1 && !!onChange;

  const handleSelect = (nextGroupId: string) => {
    onChange?.(nextGroupId);
    setOpen(false);
    setSearchQuery('');
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Group</Text>
        {headerAction}
      </View>

      {canChange && open ? (
        <View style={[styles.field, styles.fieldOpen]}>
          <TextInput
            ref={searchInputRef}
            style={styles.fieldInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={closeDropdown}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close group search"
          >
            <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.field}
          onPress={() => {
            if (canChange) setOpen(true);
          }}
          disabled={!canChange}
          accessibilityRole={canChange ? 'button' : 'text'}
          accessibilityState={{ expanded: open, disabled: !canChange }}
        >
          <Text style={styles.fieldValue} numberOfLines={1}>
            {selectedGroup.name}
          </Text>
          {canChange ? (
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          ) : null}
        </TouchableOpacity>
      )}

      {canChange && open && (
        <View style={styles.menu}>
          <ScrollView
            style={styles.menuScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filteredGroups.length === 0 ? (
              <Text style={styles.emptySearch}>No groups match your search</Text>
            ) : (
              filteredGroups.map((group, index) => {
                const selected = group.id === groupId;
                const isLast = index === filteredGroups.length - 1;

                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.menuRow,
                      selected && styles.menuRowSelected,
                      isLast && styles.menuRowLast,
                    ]}
                    onPress={() => handleSelect(group.id)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[styles.menuText, selected && styles.menuTextSelected]}
                      numberOfLines={1}
                    >
                      {group.name}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fieldOpen: {
    borderColor: colors.primary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    paddingVertical: 0,
  },
  menu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  menuScroll: {
    maxHeight: MAX_MENU_HEIGHT,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  menuRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  menuTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptySearch: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
  },
});
