import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateData } from 'react-native-calendars';
import { colors } from '../constants/theme';

interface CalendarDayMarking {
  marked?: boolean;
  selected?: boolean;
  disabled?: boolean;
  inactive?: boolean;
  today?: boolean;
  overdue?: boolean;
  dots?: { color: string }[];
  selectedColor?: string;
  selectedTextColor?: string;
  disableTouchEvent?: boolean;
}

interface CalendarDayCellProps {
  date?: DateData;
  state?: '' | 'selected' | 'disabled' | 'inactive' | 'today';
  marking?: CalendarDayMarking;
  onPress?: (date?: DateData) => void;
  onLongPress?: (date?: DateData) => void;
  children?: React.ReactNode;
}

export function CalendarDayCell({
  date,
  state,
  marking = {},
  onPress,
  onLongPress,
  children,
}: CalendarDayCellProps) {
  const isSelected = marking.selected || state === 'selected';
  const isDisabled = marking.disabled ?? state === 'disabled';
  const isInactive = marking.inactive ?? state === 'inactive';
  const isToday = marking.today ?? state === 'today';
  const isOverdue = marking.overdue;
  const touchDisabled = isDisabled || isInactive || marking.disableTouchEvent;

  const backgroundColor = isSelected
    ? (marking.selectedColor ?? colors.primary)
    : 'transparent';

  const textColor = isSelected
    ? (marking.selectedTextColor ?? colors.onPrimary)
    : isDisabled || isInactive
      ? colors.textMuted
      : isOverdue
        ? colors.error
        : isToday
          ? colors.primary
          : colors.text;

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && { backgroundColor }]}
      onPress={() => onPress?.(date)}
      onLongPress={() => onLongPress?.(date)}
      disabled={touchDisabled}
      activeOpacity={0.65}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.dayText,
          { color: textColor },
          isOverdue && !isSelected && styles.overdueText,
          isSelected && styles.selectedText,
        ]}
      >
        {children}
      </Text>
      {marking.marked && (marking.dots?.length ?? 0) > 0 ? (
        <View style={styles.dotsRow}>
          {marking.dots!.slice(0, 3).map((dot, index) => (
            <View
              key={`${dot.color}-${index}`}
              style={[
                styles.dot,
                {
                  backgroundColor: isSelected
                    ? (marking.selectedTextColor ?? colors.onPrimary)
                    : dot.color,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 36,
    borderRadius: 16,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  overdueText: {
    fontWeight: '700',
  },
  selectedText: {
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 1,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
