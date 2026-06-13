import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { ItemDateTimeField } from './ItemDateTimeField';
import { colors, spacing, typography } from '../constants/theme';
import { countTripDays, formatTripDateKey, getTripDateRangeError, parseTripDateKey } from '../utils/trips';

interface TripDateRangeFieldProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (dateKey: string) => void;
  onEndDateChange: (dateKey: string) => void;
  label?: string;
}

export function TripDateRangeField({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Travel dates',
}: TripDateRangeFieldProps) {
  const startValue = parseTripDateKey(startDate);
  const endValue = parseTripDateKey(endDate);
  const rangeError = getTripDateRangeError(startDate, endDate);
  const dayCount = rangeError ? null : countTripDays(startDate, endDate);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.fieldBlock}>
        <ItemDateTimeField
          value={startValue}
          onChange={(date) => onStartDateChange(formatTripDateKey(date))}
          dateOnly
          sheetTitle="Start date"
          error={Boolean(rangeError)}
        />
      </View>

      <View style={styles.fieldBlock}>
        <ItemDateTimeField
          value={endValue}
          onChange={(date) => onEndDateChange(formatTripDateKey(date))}
          dateOnly
          fieldLabel="To"
          sheetTitle="To date"
          error={Boolean(rangeError)}
        />
      </View>

      {rangeError ? (
        <Text style={styles.error}>{rangeError}</Text>
      ) : (
        <Text style={styles.hint}>
          {dayCount} {dayCount === 1 ? 'day' : 'days'} · {format(startValue, 'MMM d')} –{' '}
          {format(endValue, 'MMM d, yyyy')}
        </Text>
      )}
    </View>
  );
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
  fieldBlock: {
    gap: spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
});
