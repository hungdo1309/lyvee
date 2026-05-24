import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Calendar, DateData } from 'react-native-calendars';
import { addMonths, format, isBefore, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { ItemInstance } from '../utils/itemInstances';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { getInstancesForDate, getMarkedDatesFromItems } from '../utils/dates';
import { Item, User } from '../types';
import { ItemCard } from './ItemCard';
import { EmptyHint } from './EmptyState';
import { MonthYearPicker } from './MonthYearPicker';
import { SwipeableView } from './SwipeableView';
import { formatAssigneeLabel } from '../utils/assignees';

interface CalendarViewProps {
  items: Item[];
  onToggleComplete?: (instance: ItemInstance) => void;
  onEditItem: (instance: ItemInstance) => void;
  onDeleteItem: (instance: ItemInstance) => void;
  groupMembers?: User[];
  groupName?: string;
  userId?: string;
  visibleMonth?: string;
  onVisibleMonthChange?: (month: string) => void;
  includeExpired?: boolean;
}

function sortInstancesByTime(instances: ItemInstance[]): ItemInstance[] {
  return [...instances].sort((a, b) => {
    if (!a.occurrenceDate && !b.occurrenceDate) return 0;
    if (!a.occurrenceDate) return 1;
    if (!b.occurrenceDate) return -1;
    return a.occurrenceDate.localeCompare(b.occurrenceDate);
  });
}

function isExpiredInstance(instance: ItemInstance): boolean {
  if (instance.completed) return true;
  if (!instance.occurrenceDate) return false;
  return isBefore(parseISO(instance.occurrenceDate), startOfDay(new Date()));
}

export function CalendarView({
  items,
  onToggleComplete,
  onEditItem,
  onDeleteItem,
  groupMembers = [],
  groupName,
  userId,
  visibleMonth: visibleMonthProp,
  onVisibleMonthChange,
  includeExpired = false,
}: CalendarViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
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

  const markedDates = useMemo(
    () => getMarkedDatesFromItems(items, monthDate, { includeExpired }),
    [items, monthDate, includeExpired]
  );

  const dayInstances = useMemo(
    () =>
      sortInstancesByTime(
        getInstancesForDate(items, parseISO(selectedDate), { includeExpired })
      ),
    [items, selectedDate, includeExpired]
  );

  const allMarked = {
    ...markedDates,
    [selectedDate]: {
      ...markedDates[selectedDate],
      marked: markedDates[selectedDate]?.marked ?? dayInstances.length > 0,
      selected: true,
      selectedColor: colors.primary,
    },
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
  }, [items]);

  return (
    <View style={styles.container}>
      <View style={styles.calendarCard}>
        <SwipeableView
          style={styles.monthNav}
          onSwipeLeft={() => shiftMonth(1)}
          onSwipeRight={() => shiftMonth(-1)}
        >
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
        </SwipeableView>

        <Calendar
          key={visibleMonth}
          current={visibleMonth}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markedDates={allMarked}
          markingType="multi-dot"
          enableSwipeMonths
          hideExtraDays={false}
          hideArrows
          headerStyle={styles.hiddenCalendarHeader}
          renderHeader={() => null}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: colors.textMuted,
            dotColor: colors.primary,
            selectedDotColor: '#ffffff',
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
        <Text style={styles.dayTitle}>
          {format(parseISO(selectedDate), 'EEEE, MMMM d')}
        </Text>
        <Text style={styles.itemCount}>
          {dayInstances.length} {dayInstances.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View style={styles.list}>
        {dayInstances.length === 0 ? (
          <EmptyHint message="Nothing scheduled for this day" />
        ) : (
          dayInstances.map((instance) => (
            <ItemCard
              key={instance.instanceKey}
              instance={instance}
              expanded={expandedInstanceKey === instance.instanceKey}
              faded={isExpiredInstance(instance)}
              onToggleExpand={() =>
                setExpandedInstanceKey((current) =>
                  current === instance.instanceKey ? null : instance.instanceKey
                )
              }
              onToggleComplete={
                onToggleComplete ? () => onToggleComplete(instance) : undefined
              }
              assigneeLabel={formatAssigneeLabel(instance.item.assignedTo, groupMembers)}
              groupName={groupName}
              isOwner={instance.item.createdBy === userId}
              onEdit={instance.item.createdBy === userId ? () => onEditItem(instance) : undefined}
              onDelete={
                instance.item.createdBy === userId ? () => onDeleteItem(instance) : undefined
              }
            />
          ))
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
  itemCount: {
    ...typography.caption,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.md,
  },
});
