import React, { useEffect, useMemo, useState } from 'react';
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
import { Calendar, DateData } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CancelButton } from './CancelButton';
import { Button } from './Button';
import { colors, radius, spacing } from '../constants/theme';

interface ItemDateTimeFieldProps {
  value: Date;
  onChange: (date: Date) => void;
}

type PickerMode = 'date' | 'time';

function mergeDateWithTime(dateString: string, timeSource: Date): Date {
  const selected = parseISO(dateString);
  return new Date(
    selected.getFullYear(),
    selected.getMonth(),
    selected.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    0,
    0
  );
}

export function ItemDateTimeField({ value, onChange }: ItemDateTimeFieldProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PickerMode>('date');
  const [draft, setDraft] = useState(value);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    format(startOfMonth(value), 'yyyy-MM-dd')
  );

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setMode('date');
      setCalendarMonth(format(startOfMonth(value), 'yyyy-MM-dd'));
    }
  }, [visible, value]);

  const draftKey = format(draft, 'yyyy-MM-dd');
  const monthDate = useMemo(() => parseISO(calendarMonth), [calendarMonth]);
  const monthLabel = format(monthDate, 'MMMM yyyy');

  const handleConfirm = () => {
    onChange(draft);
    setVisible(false);
  };

  const handlePickerChange = (_event: unknown, date?: Date) => {
    if (date) {
      setDraft(date);
    }
  };

  const handleDayPress = (day: DateData) => {
    setDraft((current) => mergeDateWithTime(day.dateString, current));
  };

  const shiftMonth = (delta: number) => {
    setCalendarMonth(format(startOfMonth(addMonths(monthDate, delta)), 'yyyy-MM-dd'));
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Change date and time, ${format(value, 'EEEE, MMMM d, yyyy h:mm a')}`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.weekdayLine}>{format(value, 'EEEE')}</Text>
          <Text style={styles.dateLine}>{format(value, 'MMMM d, yyyy')}</Text>
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

            <View style={styles.summaryCard}>
              <Text style={styles.summaryWeekday}>{format(draft, 'EEEE')}</Text>
              <Text style={styles.summaryDate}>{format(draft, 'MMMM d, yyyy')}</Text>
              <Text style={styles.summaryTime}>{format(draft, 'h:mm a')}</Text>
            </View>

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

            {mode === 'date' ? (
              <View style={styles.calendarCard}>
                <View style={styles.monthNav}>
                  <TouchableOpacity
                    style={styles.monthNavButton}
                    onPress={() => shiftMonth(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                  >
                    <Ionicons name="chevron-back" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.monthNavTitle}>{monthLabel}</Text>
                  <TouchableOpacity
                    style={styles.monthNavButton}
                    onPress={() => shiftMonth(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                  >
                    <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <Calendar
                  key={calendarMonth}
                  current={calendarMonth}
                  onDayPress={handleDayPress}
                  markedDates={{
                    [draftKey]: {
                      selected: true,
                      selectedColor: colors.primary,
                    },
                  }}
                  enableSwipeMonths={false}
                  hideExtraDays={false}
                  hideArrows
                  renderHeader={() => null}
                  headerStyle={styles.hiddenCalendarHeader}
                  theme={{
                    backgroundColor: colors.surface,
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: colors.onPrimary,
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    textDisabledColor: colors.textMuted,
                    arrowColor: colors.primary,
                    monthTextColor: colors.text,
                    textDayFontWeight: '500',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '700',
                    textDayFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                  style={styles.calendar}
                />
              </View>
            ) : (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={draft}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
                  onChange={handlePickerChange}
                  themeVariant="light"
                  style={styles.picker}
                />
              </View>
            )}

            <View style={styles.actions}>
              <CancelButton
                onPress={() => setVisible(false)}
                style={styles.actionButton}
              />
              <Button
                title="Done"
                variant="primary"
                onPress={handleConfirm}
                style={styles.actionButton}
              />
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
  weekdayLine: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryWeekday: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTime: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
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
  calendarCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  hiddenCalendarHeader: {
    height: 0,
    overflow: 'hidden',
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
    opacity: 0,
  },
  calendar: {
    borderWidth: 0,
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
  actionButton: {
    flex: 1,
  },
});
