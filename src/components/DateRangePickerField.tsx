import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Ionicons from '@expo/vector-icons/Ionicons';
import { differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CancelButton } from './CancelButton';
import { Button } from './Button';
import { colors, radius, spacing, typography } from '../constants/theme';
import {
  applyCalendarDateRangeTap,
  buildCalendarPeriodMarkedDates,
  calendarMonthForRangeSelection,
  clampDateKeyToBounds,
  normalizeCalendarDateRange,
  shiftMonthKey,
} from '../utils/calendarRangeSelection';

interface DateRangePickerFieldProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (dateKey: string) => void;
  onEndDateChange: (dateKey: string) => void;
  label?: string;
  sheetTitle?: string;
  minDate?: string;
  maxDate?: string;
  getRangeError?: (startDate: string, endDate: string) => string | null;
  formatDayCountLabel?: (startDate: string, endDate: string) => string | null;
  readOnly?: boolean;
  startFieldLabel?: string;
  endFieldLabel?: string;
}

export function DateRangePickerField({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
  sheetTitle = 'Select dates',
  minDate,
  maxDate,
  getRangeError,
  formatDayCountLabel,
  readOnly = false,
  startFieldLabel = 'From',
  endFieldLabel = 'To',
}: DateRangePickerFieldProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState<string | null>(endDate);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    format(startOfMonth(parseISO(startDate)), 'yyyy-MM-dd')
  );

  useEffect(() => {
    if (!visible) return;
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setCalendarMonth(format(startOfMonth(parseISO(startDate)), 'yyyy-MM-dd'));
  }, [visible, startDate, endDate]);

  const monthLabel = format(parseISO(calendarMonth), 'MMMM yyyy');
  const draftRange = normalizeCalendarDateRange({
    startDateKey: draftStart,
    endDateKey: draftEnd,
  });
  const draftDayCountLabel =
    draftEnd && draftRange
      ? formatDayCountLabel?.(draftRange.startDateKey, draftRange.endDateKey) ??
        formatDefaultDayCountLabel(draftRange.startDateKey, draftRange.endDateKey)
      : null;
  const draftRangeError =
    draftEnd && draftRange && getRangeError
      ? getRangeError(draftRange.startDateKey, draftRange.endDateKey)
      : null;
  const committedRangeError = getRangeError
    ? getRangeError(startDate, endDate)
    : null;

  const markedDates = useMemo(
    () =>
      buildCalendarPeriodMarkedDates(
        draftStart,
        draftEnd,
        colors.primary,
        colors.onPrimary
      ),
    [draftStart, draftEnd]
  );

  const handleDayPress = (day: DateData) => {
    const dateKey = clampDateKeyToBounds(day.dateString, minDate, maxDate);
    const next = applyCalendarDateRangeTap(
      { startDateKey: draftStart, endDateKey: draftEnd },
      dateKey
    );
    setDraftStart(next.startDateKey);
    setDraftEnd(next.endDateKey);

    const nextMonth = calendarMonthForRangeSelection(next.startDateKey, next.endDateKey);
    if (nextMonth) {
      setCalendarMonth(nextMonth);
    }
  };

  const handleConfirm = () => {
    const normalized = normalizeCalendarDateRange({
      startDateKey: draftStart,
      endDateKey: draftEnd,
    });
    if (!normalized) return;

    onStartDateChange(normalized.startDateKey);
    onEndDateChange(normalized.endDateKey);
    setVisible(false);
  };

  const startValue = parseISO(startDate);
  const endValue = parseISO(endDate);
  const hasError = Boolean(committedRangeError);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.field, hasError && styles.fieldError]}
        onPress={() => {
          if (!readOnly) setVisible(true);
        }}
        disabled={readOnly}
        activeOpacity={readOnly ? 1 : 0.7}
        accessibilityRole={readOnly ? 'text' : 'button'}
        accessibilityLabel={`${startFieldLabel} ${format(startValue, 'MMMM d, yyyy')} ${endFieldLabel} ${format(endValue, 'MMMM d, yyyy')}`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <View style={styles.dateRow}>
            <Text style={styles.dateRowLabel}>{startFieldLabel}</Text>
            <Text style={styles.dateRowValue}>{format(startValue, 'MMM d, yyyy')}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateRowLabel}>{endFieldLabel}</Text>
            <Text style={styles.dateRowValue}>{format(endValue, 'MMM d, yyyy')}</Text>
          </View>
        </View>
        {!readOnly ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </TouchableOpacity>

      {committedRangeError ? <Text style={styles.error}>{committedRangeError}</Text> : null}

      {!readOnly ? (
        <Modal
          visible={visible}
          transparent
          animationType="slide"
          presentationStyle="overFullScreen"
          onRequestClose={() => setVisible(false)}
          statusBarTranslucent={Platform.OS === 'android'}
        >
          <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
              onPress={() => undefined}
            >
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>{sheetTitle}</Text>

              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{startFieldLabel}</Text>
                  <Text style={styles.summaryValue}>
                    {draftRange
                      ? format(parseISO(draftRange.startDateKey), 'EEE, MMM d, yyyy')
                      : '—'}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{endFieldLabel}</Text>
                  <Text style={styles.summaryValue}>
                    {draftEnd
                      ? format(parseISO(draftRange!.endDateKey), 'EEE, MMM d, yyyy')
                      : '—'}
                  </Text>
                </View>
                {draftDayCountLabel ? (
                  <>
                    <View style={styles.summaryDivider} />
                    <Text style={styles.summaryDayCount}>{draftDayCountLabel}</Text>
                  </>
                ) : null}
              </View>

              <View style={styles.calendarCard}>
                <View style={styles.monthNav}>
                  <TouchableOpacity
                    style={styles.monthNavButton}
                    onPress={() => setCalendarMonth((current) => shiftMonthKey(current, -1))}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                  >
                    <Ionicons name="chevron-back" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.monthNavTitle}>{monthLabel}</Text>
                  <TouchableOpacity
                    style={styles.monthNavButton}
                    onPress={() => setCalendarMonth((current) => shiftMonthKey(current, 1))}
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
                  minDate={minDate}
                  maxDate={maxDate}
                  markingType="period"
                  markedDates={markedDates}
                  enableSwipeMonths={false}
                  hideExtraDays={false}
                  hideArrows
                  renderHeader={() => null}
                  headerStyle={styles.hiddenCalendarHeader}
                  theme={{
                    backgroundColor: colors.surface,
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.textSecondary,
                    todayTextColor: colors.primary,
                    dayTextColor: colors.text,
                    textDisabledColor: colors.textMuted,
                    monthTextColor: colors.text,
                    textDayFontWeight: '500',
                    textDayHeaderFontWeight: '700',
                    textDayFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                  style={styles.calendar}
                />
              </View>

              {draftRangeError ? (
                <Text style={styles.sheetError}>{draftRangeError}</Text>
              ) : null}
              </ScrollView>

              <View style={styles.actions}>
                <CancelButton onPress={() => setVisible(false)} style={styles.actionButton} />
                <Button
                  title="Done"
                  variant="primary"
                  onPress={handleConfirm}
                  style={styles.actionButton}
                  disabled={!draftRange || Boolean(draftRangeError)}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function formatDefaultDayCountLabel(startDate: string, endDate: string): string {
  const dayCount = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
  return `${dayCount} ${dayCount === 1 ? 'day' : 'days'}`;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
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
    marginBottom: spacing.xs,
  },
  fieldError: {
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
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
    gap: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateRowLabel: {
    width: 42,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateRowValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
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
  sheetContent: {
    paddingBottom: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  summaryDayCount: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    paddingTop: spacing.xs,
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
  sheetError: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
