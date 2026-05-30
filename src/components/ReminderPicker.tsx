import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ItemReminderOffset,
  REMINDER_OPTIONS,
  User,
  getReminderOptionLabel,
} from '../types';
import { getReminderAudienceHint } from '../utils/reminders';
import { colors, radius, spacing } from '../constants/theme';

interface ReminderPickerProps {
  value: ItemReminderOffset;
  onChange: (value: ItemReminderOffset) => void;
  assignedTo: string[];
  groupMembers: User[];
  disabled?: boolean;
  readOnly?: boolean;
}

export function ReminderPicker({
  value,
  onChange,
  assignedTo,
  groupMembers,
  disabled = false,
  readOnly = false,
}: ReminderPickerProps) {
  const [open, setOpen] = useState(false);

  if (disabled) return null;

  const hint = getReminderAudienceHint(assignedTo, groupMembers);

  if (readOnly) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>Reminder</Text>
        <View style={styles.pillRow}>
          <View style={[styles.pill, styles.pillSelected]}>
            <Text style={styles.pillTextSelected}>{getReminderOptionLabel(value)}</Text>
          </View>
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Reminder</Text>
      <TouchableOpacity
        style={[styles.field, open && styles.fieldOpen]}
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.fieldValue}>{getReminderOptionLabel(value)}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      <Text style={styles.hint}>{hint}</Text>

      {open && (
        <View style={styles.menu}>
          <ScrollView style={styles.menuScroll} nestedScrollEnabled>
            {REMINDER_OPTIONS.map((option, index) => {
              const selected = option.value === value;
              const isLast = index === REMINDER_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.menuRow,
                    selected && styles.menuRowSelected,
                    isLast && styles.menuRowLast,
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[styles.menuText, selected && styles.menuTextSelected]}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  pillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pillTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
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
    maxHeight: 280,
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
});
