import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CancelButton } from './CancelButton';
import { Button } from './Button';
import { colors, layout, radius, spacing } from '../constants/theme';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface MonthYearPickerProps {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export function MonthYearPicker({
  visible,
  value,
  onClose,
  onConfirm,
}: MonthYearPickerProps) {
  const [year, setYear] = useState(value.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());

  useEffect(() => {
    if (visible) {
      setYear(value.getFullYear());
      setSelectedMonth(value.getMonth());
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onConfirm(new Date(year, selectedMonth, 1));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.yearRow}>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setYear((y) => y - 1)}
              accessibilityRole="button"
              accessibilityLabel="Previous year"
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.yearLabel}>{year}</Text>
            <TouchableOpacity
              style={styles.yearButton}
              onPress={() => setYear((y) => y + 1)}
              accessibilityRole="button"
              accessibilityLabel="Next year"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTHS.map((label, index) => {
              const selected = selectedMonth === index;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.monthCell, selected && styles.monthCellSelected]}
                  onPress={() => setSelectedMonth(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.monthLabel, selected && styles.monthLabelSelected]}
                  >
                    {label.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <CancelButton onPress={onClose} style={styles.actionButton} />
            <Button
              title="Go"
              variant="primary"
              onPress={handleConfirm}
              style={styles.actionButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  yearButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    minWidth: 64,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  monthCell: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  monthCellSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  monthLabelSelected: {
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
