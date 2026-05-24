import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { ItemType, ItemVisibility, RecurringRule, User } from '../types';
import { colors, itemTypeConfig, radius, spacing, itemTypeSupportsRecurring } from '../constants/theme';
import { formatRecurringLabel } from '../utils/recurrence';
import { RECURRING_PRESETS } from '../services/items';
import { MemberPicker } from './MemberPicker';

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

function OptionChip({ label, selected, onPress, color }: OptionChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        selected && color ? { backgroundColor: color + '20', borderColor: color } : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          selected && color ? { color } : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface ItemTypePickerProps {
  type: ItemType;
  onTypeChange: (type: ItemType) => void;
}

export function ItemTypePicker({ type, onTypeChange }: ItemTypePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {TYPE_OPTIONS.map((t) => (
          <OptionChip
            key={t}
            label={itemTypeConfig[t].label}
            selected={type === t}
            onPress={() => onTypeChange(t)}
            color={itemTypeConfig[t].color}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface ItemFormOptionsProps {
  type: ItemType;
  visibility: ItemVisibility;
  recurringRule: RecurringRule;
  onTypeChange: (type: ItemType) => void;
  onVisibilityChange: (visibility: ItemVisibility) => void;
  onRecurringChange: (rule: RecurringRule) => void;
  groupMembers?: User[];
  assignedTo?: string[];
  onAssignedToChange?: (ids: string[]) => void;
  visibilityMembers?: User[];
  allowedMembers?: string[];
  onAllowedMembersChange?: (ids: string[]) => void;
  hideType?: boolean;
}

const TYPE_OPTIONS: ItemType[] = ['task', 'activity', 'document'];
const VISIBILITY_OPTIONS: ItemVisibility[] = ['everyone', 'private', 'custom'];
const CUSTOM_UNITS = ['days', 'weeks', 'months', 'years'] as const;

function parseCustomInterval(value: string): number {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 1;
  return Math.min(999, Math.max(1, parseInt(digits, 10)));
}

function isSameRule(a: RecurringRule, b: RecurringRule): boolean {
  return (
    a.frequency === b.frequency &&
    (a.interval ?? 1) === (b.interval ?? 1) &&
    (a.unit ?? 'days') === (b.unit ?? 'days')
  );
}

export function ItemFormOptions({
  type,
  visibility,
  recurringRule,
  onTypeChange,
  onVisibilityChange,
  onRecurringChange,
  groupMembers,
  assignedTo,
  onAssignedToChange,
  visibilityMembers,
  allowedMembers,
  onAllowedMembersChange,
  hideType = false,
}: ItemFormOptionsProps) {
  const isCustomSelected = recurringRule.frequency === 'custom';
  const showRecurring = itemTypeSupportsRecurring(type);

  return (
    <View style={styles.container}>
      {!hideType && (
        <ItemTypePicker type={type} onTypeChange={onTypeChange} />
      )}

      {showRecurring && (
        <>
          <Text style={[styles.sectionLabel, hideType && styles.sectionLabelFirst]}>Repeat</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
            {RECURRING_PRESETS.map((rule) => (
              <OptionChip
                key={`${rule.frequency}-${rule.interval ?? ''}-${rule.unit ?? ''}`}
                label={formatRecurringLabel(rule)}
                selected={isSameRule(recurringRule, rule)}
                onPress={() => onRecurringChange(rule)}
              />
            ))}
            <OptionChip
              label="Custom"
              selected={isCustomSelected}
              onPress={() =>
                onRecurringChange({
                  frequency: 'custom',
                  interval: recurringRule.interval ?? 1,
                  unit: recurringRule.unit ?? 'days',
                })
              }
            />
          </ScrollView>

          {isCustomSelected && (
            <View style={styles.customSection}>
              <View style={styles.customIntervalRow}>
                <Text style={styles.customLabel}>Every</Text>
                <TextInput
                  style={styles.intervalInput}
                  value={String(recurringRule.interval ?? 1)}
                  onChangeText={(text) =>
                    onRecurringChange({
                      ...recurringRule,
                      frequency: 'custom',
                      interval: parseCustomInterval(text),
                    })
                  }
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.customUnitRow}
              >
                {CUSTOM_UNITS.map((unit) => (
                  <OptionChip
                    key={unit}
                    label={unit}
                    selected={(recurringRule.unit ?? 'days') === unit}
                    onPress={() =>
                      onRecurringChange({
                        ...recurringRule,
                        frequency: 'custom',
                        unit,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <Text style={[styles.sectionLabel, hideType && !showRecurring && styles.sectionLabelFirst]}>
        Visibility
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {VISIBILITY_OPTIONS.map((v) => (
          <OptionChip
            key={v}
            label={v.charAt(0).toUpperCase() + v.slice(1)}
            selected={visibility === v}
            onPress={() => onVisibilityChange(v)}
          />
        ))}
      </ScrollView>

      {visibility === 'custom' && visibilityMembers && onAllowedMembersChange && (
        <MemberPicker
          members={visibilityMembers}
          selectedIds={allowedMembers ?? []}
          onChange={onAllowedMembersChange}
          label="Who can see this item"
        />
      )}

      {groupMembers && onAssignedToChange && (
        <>
          <MemberPicker
            members={groupMembers}
            selectedIds={assignedTo ?? []}
            onChange={onAssignedToChange}
            label="Assign to"
            emptyMessage="Add members to your group to assign items."
          />
          <Text style={styles.visibilityHint}>
            Assigned members can always see this item, in addition to the visibility setting above.
          </Text>
        </>
      )}
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
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabelFirst: {
    marginTop: 0,
  },
  row: {
    marginBottom: spacing.xs,
  },
  customSection: {
    marginBottom: spacing.sm,
  },
  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  customUnitRow: {
    marginBottom: spacing.xs,
  },
  customLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  intervalInput: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  visibilityHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
});
