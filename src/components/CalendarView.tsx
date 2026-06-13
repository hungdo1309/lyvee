import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Calendar, DateData } from 'react-native-calendars';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { ItemInstance } from '../utils/itemInstances';
import { Trip } from '../types/trips';
import { TripPlanInstance } from '../utils/tripInstances';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { getInstancesForDate, getMarkedDatesFromItems } from '../utils/dates';
import {
  getMarkedDatesFromTrips,
  getTripPlanInstancesForDate,
  mergeCalendarMarkedDates,
} from '../utils/tripInstances';
import { Item, User } from '../types';
import { ItemCard } from './ItemCard';
import { TripPlanItemCard } from './TripPlanItemCard';
import { EmptyHint } from './EmptyState';
import { MonthYearPicker } from './MonthYearPicker';
import { CalendarDayCell } from './CalendarDayCell';
import { formatAssigneeLabel, canUserCompleteTask } from '../utils/assignees';

interface CalendarViewProps {
  items: Item[];
  trips?: Trip[];
  onToggleComplete?: (instance: ItemInstance) => void;
  onOpenItem: (instance: ItemInstance) => void;
  onOpenTripPlanItem?: (instance: TripPlanInstance) => void;
  onEditItem: (instance: ItemInstance) => void;
  onDeleteItem: (instance: ItemInstance) => void;
  groupMembers?: User[];
  groupName?: string;
  userId?: string;
  visibleMonth?: string;
  onVisibleMonthChange?: (month: string) => void;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
}

function sortInstancesByTime(instances: ItemInstance[]): ItemInstance[] {
  return [...instances].sort((a, b) => {
    if (!a.occurrenceDate && !b.occurrenceDate) return 0;
    if (!a.occurrenceDate) return 1;
    if (!b.occurrenceDate) return -1;
    return a.occurrenceDate.localeCompare(b.occurrenceDate);
  });
}

export function CalendarView({
  items,
  trips = [],
  onToggleComplete,
  onOpenItem,
  onOpenTripPlanItem,
  onEditItem,
  onDeleteItem,
  groupMembers = [],
  groupName,
  userId,
  visibleMonth: visibleMonthProp,
  onVisibleMonthChange,
  selectedDate: selectedDateProp,
  onSelectedDateChange,
}: CalendarViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [internalSelectedDate, setInternalSelectedDate] = useState(today);
  const selectedDate = selectedDateProp ?? internalSelectedDate;
  const [internalVisibleMonth, setInternalVisibleMonth] = useState(today);
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const visibleMonth = visibleMonthProp ?? internalVisibleMonth;

  const setVisibleMonth = (month: string) => {
    if (onVisibleMonthChange) {
      onVisibleMonthChange(month);
    } else {
      setInternalVisibleMonth(month);
    }
  };

  const monthDate = useMemo(() => parseISO(visibleMonth), [visibleMonth]);
  const monthLabel = format(monthDate, 'MMMM yyyy');

  const markedDates = useMemo(() => {
    const itemMarked = getMarkedDatesFromItems(items, monthDate);
    const tripMarked = getMarkedDatesFromTrips(trips, monthDate);
    return mergeCalendarMarkedDates(itemMarked, tripMarked);
  }, [items, trips, monthDate]);

  const dayInstances = useMemo(
    () =>
      sortInstancesByTime(getInstancesForDate(items, parseISO(selectedDate))),
    [items, selectedDate]
  );

  const dayTripInstances = useMemo(
    () => getTripPlanInstancesForDate(trips, parseISO(selectedDate)),
    [trips, selectedDate]
  );

  const dayEntryCount = dayInstances.length + dayTripInstances.length;

  const selectedDateOverdue = markedDates[selectedDate]?.overdue ?? false;

  const allMarked = useMemo(() => {
    const merged: Record<string, Record<string, unknown>> = {};

    for (const [dateKey, marking] of Object.entries(markedDates)) {
      merged[dateKey] = { ...marking };
    }

    merged[selectedDate] = {
      ...merged[selectedDate],
      marked: merged[selectedDate]?.marked ?? dayEntryCount > 0,
      selected: true,
      selectedColor: selectedDateOverdue ? colors.error : colors.primary,
      selectedTextColor: colors.onPrimary,
      overdue: selectedDateOverdue,
    };

    return merged;
  }, [markedDates, selectedDate, dayEntryCount, selectedDateOverdue]);

  const setSelectedDate = (date: string) => {
    if (onSelectedDateChange) {
      onSelectedDateChange(date);
    } else {
      setInternalSelectedDate(date);
    }
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setExpandedInstanceKey(null);
  };

  const handleMonthChange = (month: DateData) => {
    setVisibleMonth(month.dateString);
    setExpandedInstanceKey(null);
  };

  const shiftMonth = (delta: number) => {
    const next = format(startOfMonth(addMonths(monthDate, delta)), 'yyyy-MM-dd');
    setVisibleMonth(next);
    setExpandedInstanceKey(null);
  };

  const applyMonthPicker = (date: Date) => {
    setVisibleMonth(format(startOfMonth(date), 'yyyy-MM-dd'));
    setShowMonthPicker(false);
    setExpandedInstanceKey(null);
  };

  useEffect(() => {
    setExpandedInstanceKey(null);
  }, [items, trips]);

  return (
    <View style={styles.container}>
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

          <TouchableOpacity
            style={styles.monthNavLabel}
            onPress={() => setShowMonthPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Change month, ${monthLabel}`}
          >
            <Text style={styles.monthNavTitle}>{monthLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>

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
          key={visibleMonth}
          current={visibleMonth}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markedDates={allMarked}
          markingType="multi-dot"
          dayComponent={CalendarDayCell}
          enableSwipeMonths={false}
          hideExtraDays={false}
          hideArrows
          headerStyle={styles.hiddenCalendarHeader}
          renderHeader={() => null}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.onPrimary,
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: colors.textMuted,
            dotColor: colors.primary,
            selectedDotColor: colors.onPrimary,
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 15,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 13,
          }}
          style={styles.calendar}
        />
      </View>

      <MonthYearPicker
        visible={showMonthPicker}
        value={monthDate}
        onClose={() => setShowMonthPicker(false)}
        onConfirm={applyMonthPicker}
      />

      <View style={styles.daySection}>
        <Text style={[styles.dayTitle, selectedDateOverdue && styles.dayTitleOverdue]}>
          {format(parseISO(selectedDate), 'EEEE, MMMM d')}
        </Text>
        <Text style={styles.itemCount}>
          {dayEntryCount} {dayEntryCount === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View style={styles.list}>
        {dayEntryCount === 0 ? (
          <EmptyHint message="Nothing scheduled for this day" />
        ) : (
          <>
            {dayInstances.map((instance) => (
              <ItemCard
                key={instance.instanceKey}
                instance={instance}
                expanded={expandedInstanceKey === instance.instanceKey}
                faded={instance.completed}
                onToggleExpand={() =>
                  setExpandedInstanceKey((current) =>
                    current === instance.instanceKey ? null : instance.instanceKey
                  )
                }
                onView={() => onOpenItem(instance)}
                onToggleComplete={
                  onToggleComplete && canUserCompleteTask(instance.item, userId)
                    ? () => onToggleComplete(instance)
                    : undefined
                }
                assigneeLabel={formatAssigneeLabel(instance.item.assignedTo, groupMembers)}
                groupName={groupName}
                isOwner={instance.item.createdBy === userId}
                onEdit={instance.item.createdBy === userId ? () => onEditItem(instance) : undefined}
                onDelete={
                  instance.item.createdBy === userId ? () => onDeleteItem(instance) : undefined
                }
              />
            ))}
            {dayTripInstances.map((instance) => (
              <TripPlanItemCard
                key={instance.instanceKey}
                instance={instance}
                groupName={groupName}
                onPress={() => onOpenTripPlanItem?.(instance)}
              />
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },
  calendarCard: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.sectionGap,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  },
  monthNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  monthNavTitle: {
    fontSize: 18,
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
    marginHorizontal: 0,
    marginBottom: 0,
  },
  daySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  dayTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  dayTitleOverdue: {
    color: colors.error,
  },
  itemCount: {
    ...typography.caption,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
});
