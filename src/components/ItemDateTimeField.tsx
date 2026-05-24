import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../constants/theme';

interface ItemDateTimeFieldProps {
  value: Date;
  onChange: (date: Date) => void;
}

type PickerMode = 'date' | 'time';

export function ItemDateTimeField({ value, onChange }: ItemDateTimeFieldProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PickerMode>('date');
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setMode('date');
    }
  }, [visible, value]);

  const handleConfirm = () => {
    onChange(draft);
    setVisible(false);
  };

  const handlePickerChange = (_event: unknown, date?: Date) => {
    if (date) {
      setDraft(date);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Change date and time, ${format(value, 'PPP p')}`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.dateLine}>{format(value, 'EEEE, MMMM d, yyyy')}</Text>
          <Text style={styles.timeLine}>{format(value, 'h:mm a')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
            onPress={() => undefined}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Date & Time</Text>

            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segment, mode === 'date' && styles.segmentActive]}
                onPress={() => setMode('date')}
              >
                <Text style={[styles.segmentText, mode === 'date' && styles.segmentTextActive]}>
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, mode === 'time' && styles.segmentActive]}
                onPress={() => setMode('time')}
              >
                <Text style={[styles.segmentText, mode === 'time' && styles.segmentTextActive]}>
                  Time
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
                onChange={handlePickerChange}
                themeVariant="light"
                style={styles.picker}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  dateLine: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeLine: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
  },
  pickerWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  picker: {
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
