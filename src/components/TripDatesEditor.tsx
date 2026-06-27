import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip } from '../types/trips';
import { DateRangePickerField } from './DateRangePickerField';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { colors, spacing, typography } from '../constants/theme';
import { formatTripDayCountLabel, getTripDateRangeError } from '../utils/trips';

interface TripDatesEditorProps {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onSave: (startDate: string, endDate: string) => Promise<void>;
}

export function TripDatesEditor({ visible, trip, onClose, onSave }: TripDatesEditorProps) {
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setError(null);
    setSaving(false);
  }, [visible, trip.startDate, trip.endDate]);

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? insets.top + spacing.md : 0),
    [insets.top]
  );

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave(startDate, endDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update trip dates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBottomSheet
      visible={visible}
      onClose={onClose}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={modalBottomSheetStyles.handle} />
      <Text style={styles.title}>Trip dates</Text>
      <Text style={styles.subtitle}>
        Adding days leaves your plan items unchanged. Shortening the trip adjusts flights and city &
        stay blocks that fall outside the new range.
      </Text>

      <DateRangePickerField
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        label="Travel dates"
        sheetTitle="Travel dates"
        getRangeError={getTripDateRangeError}
        formatDayCountLabel={formatTripDayCountLabel}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <CancelButton onPress={onClose} disabled={saving} />
        <Button title="Save dates" onPress={handleSave} loading={saving} />
      </View>
    </ModalBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.heading,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
