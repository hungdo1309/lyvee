import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatTripTime,
  formatTripTimeValue,
  getTripTimeRangeError,
  parseTripTime,
} from '../utils/tripTime';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { colors, radius, spacing, typography } from '../constants/theme';

interface TripTimeRangeFieldProps {
  startTime?: string;
  endTime?: string;
  onStartTimeChange: (value?: string) => void;
  onEndTimeChange: (value?: string) => void;
  startLabel?: string;
  endLabel?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  allowEndBeforeStart?: boolean;
  showStart?: boolean;
  showEnd?: boolean;
}

type PickerTarget = 'start' | 'end';

export function TripTimeRangeField({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startLabel = 'Start',
  endLabel = 'End',
  defaultStartTime,
  defaultEndTime,
  allowEndBeforeStart = false,
  showStart = true,
  showEnd = true,
}: TripTimeRangeFieldProps) {
  const insets = useSafeAreaInsets();
  const hasTimedValue = Boolean((showStart && startTime) || (showEnd && endTime));
  const [mode, setMode] = useState<'anytime' | 'timed'>(hasTimedValue ? 'timed' : 'anytime');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [draftTime, setDraftTime] = useState(() => parseTripTime());
  const rangeError = getTripTimeRangeError(
    showStart ? startTime : undefined,
    showEnd ? endTime : undefined,
    { allowEndBeforeStart }
  );

  useEffect(() => {
    if ((showStart && startTime) || (showEnd && endTime)) {
      setMode('timed');
    }
  }, [startTime, endTime, showStart, showEnd]);

  const setAnytime = () => {
    setMode('anytime');
    onStartTimeChange(undefined);
    onEndTimeChange(undefined);
    setPickerTarget(null);
  };

  const setTimed = () => {
    setMode('timed');
    if (showStart && !startTime && defaultStartTime) {
      onStartTimeChange(defaultStartTime);
    }
    if (showEnd && !endTime && defaultEndTime) {
      onEndTimeChange(defaultEndTime);
    }
  };

  const clearTimes = () => {
    if (showStart) onStartTimeChange(undefined);
    if (showEnd) onEndTimeChange(undefined);
    setPickerTarget(null);
  };

  const openPicker = (target: PickerTarget) => {
    const current = target === 'start' ? startTime : endTime;
    const fallback = target === 'start' ? defaultStartTime : defaultEndTime;
    setDraftTime(parseTripTime(current ?? fallback));
    setPickerTarget(target);
  };

  const closePicker = () => {
    setPickerTarget(null);
  };

  const confirmPicker = () => {
    const value = formatTripTimeValue(draftTime);
    if (pickerTarget === 'start') {
      onStartTimeChange(value);
    } else if (pickerTarget === 'end') {
      onEndTimeChange(value);
    }
    closePicker();
  };

  const handlePickerChange = (_event: unknown, date?: Date) => {
    if (date) {
      setDraftTime(date);
    }
  };

  const showClear =
    mode === 'timed' &&
    Boolean((showStart && startTime) || (showEnd && endTime));
  const pickerLabel = pickerTarget === 'start' ? startLabel : endLabel;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Time</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'anytime' && styles.modeChipActive]}
            onPress={setAnytime}
          >
            <Text style={[styles.modeChipText, mode === 'anytime' && styles.modeChipTextActive]}>
              Anytime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'timed' && styles.modeChipActive]}
            onPress={setTimed}
          >
            <Text style={[styles.modeChipText, mode === 'timed' && styles.modeChipTextActive]}>
              Timed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'timed' ? (
        <View style={styles.timeFields}>
          {showStart ? (
            <TouchableOpacity
              style={styles.timeField}
              onPress={() => openPicker('start')}
              accessibilityRole="button"
              accessibilityLabel={`Set ${startLabel}`}
            >
              <Text style={styles.timeFieldLabel}>{startLabel}</Text>
              <Text style={styles.timeFieldValue}>
                {startTime ? formatTripTime(startTime) : 'Tap to set'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {showEnd ? (
            <TouchableOpacity
              style={styles.timeField}
              onPress={() => openPicker('end')}
              accessibilityRole="button"
              accessibilityLabel={`Set ${endLabel}`}
            >
              <Text style={styles.timeFieldLabel}>{endLabel}</Text>
              <Text style={styles.timeFieldValue}>
                {endTime ? formatTripTime(endTime) : 'Tap to set'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {rangeError ? <Text style={styles.error}>{rangeError}</Text> : null}
          {showClear ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearTimes}
              accessibilityLabel="Clear times"
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Modal
        visible={pickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <Pressable style={styles.overlay} onPress={closePicker}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
            onPress={() => undefined}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{pickerLabel}</Text>
            <Text style={styles.sheetPreview}>{formatTripTime(formatTripTimeValue(draftTime))}</Text>

            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draftTime}
                mode="time"
                display="spinner"
                onChange={handlePickerChange}
                themeVariant="light"
                style={styles.picker}
              />
            </View>

            <View style={styles.actions}>
              <CancelButton onPress={closePicker} style={styles.actionButton} />
              <Button title="Done" onPress={confirmPicker} style={styles.actionButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  header: {
    gap: 4,
  },
  label: {
    ...typography.label,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeChipTextActive: {
    color: colors.primaryDark,
  },
  timeFields: {
    gap: spacing.sm,
  },
  timeField: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 2,
  },
  timeFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeFieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sheetPreview: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pickerWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 216 : undefined,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
});
