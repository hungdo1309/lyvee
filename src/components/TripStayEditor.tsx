import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip } from '../types/trips';
import { TripLocation, tripLocationFromManual } from '../types/places';
import { TripStayInput, tripStayBlockToInput, validateTripStayInput } from '../utils/tripStays';
import { TripStayBlockRecord } from '../utils/tripStayEntries';
import { formatTripDayCountLabel, getTripDateRangeError } from '../utils/trips';
import { Input } from './Input';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { LocationSearchField } from './LocationSearchField';
import { DateRangePickerField } from './DateRangePickerField';
import { TripTimeRangeField } from './TripTimeRangeField';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { colors, spacing, typography } from '../constants/theme';

interface TripStayEditorProps {
  visible: boolean;
  trip: Trip;
  tripDestination?: string | null;
  initialBlock?: TripStayBlockRecord | null;
  onClose: () => void;
  onSave: (input: TripStayInput) => Promise<void>;
}

function hasStayLocation(location: TripLocation | null): boolean {
  return Boolean(location?.label?.trim());
}

export function TripStayEditor({
  visible,
  trip,
  tripDestination,
  initialBlock,
  onClose,
  onSave,
}: TripStayEditorProps) {
  const insets = useSafeAreaInsets();
  const [city, setCity] = useState<TripLocation | null>(null);
  const [cityCleared, setCityCleared] = useState(false);
  const [startDateKey, setStartDateKey] = useState(trip.startDate);
  const [endDateKey, setEndDateKey] = useState(trip.endDate);
  const [stayLocation, setStayLocation] = useState<TripLocation | null>(null);
  const [stayLocationQuery, setStayLocationQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [checkInTime, setCheckInTime] = useState<string | undefined>('15:00');
  const [checkOutTime, setCheckOutTime] = useState<string | undefined>('11:00');
  const [stayNotes, setStayNotes] = useState('');
  const [stayLocationCleared, setStayLocationCleared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialStayLocationRef = useRef<TripLocation | null>(null);
  const initialCityRef = useRef<TripLocation | null>(null);

  const isEditing = Boolean(initialBlock);
  const showStayTimes =
    hasStayLocation(stayLocation) ||
    stayLocationQuery.trim().length >= 2 ||
    (isEditing && Boolean(initialBlock?.stay) && !stayLocationCleared);

  const staySearchNear = city;

  const handleStayLocationQueryChange = useCallback((query: string) => {
    setStayLocationQuery(query);
  }, []);

  useEffect(() => {
    if (!visible || !initialBlock) return;

    const input = tripStayBlockToInput(initialBlock);
    const loadedStayLocation =
      input.stay?.location ??
      (input.stay?.title ? tripLocationFromManual(input.stay.title) : null);
    initialStayLocationRef.current = loadedStayLocation;
    initialCityRef.current = input.city ?? null;
    setCity(input.city ?? null);
    setCityQuery(input.city?.label ?? '');
    setStartDateKey(input.startDateKey);
    setEndDateKey(input.endDateKey);
    setStayLocation(loadedStayLocation);
    setStayLocationQuery(loadedStayLocation?.label ?? '');
    setCheckInTime(input.stay?.checkInTime ?? '15:00');
    setCheckOutTime(input.stay?.checkOutTime ?? '11:00');
    setStayNotes(input.stay?.notes ?? '');
    setStayLocationCleared(false);
    setCityCleared(false);
    setError(null);
    setSaving(false);
  }, [visible, initialBlock]);

  useEffect(() => {
    if (!visible || initialBlock) return;

    initialStayLocationRef.current = null;
    initialCityRef.current = null;
    setCity(null);
    setCityQuery('');
    setStartDateKey(trip.startDate);
    setEndDateKey(trip.endDate);
    setStayLocation(null);
    setStayLocationQuery('');
    setCheckInTime('15:00');
    setCheckOutTime('11:00');
    setStayNotes('');
    setStayLocationCleared(false);
    setCityCleared(false);
    setError(null);
    setSaving(false);
  }, [visible, initialBlock, trip.startDate, trip.endDate]);

  const handleCityChange = (location: TripLocation | null) => {
    setCity(location);
    setCityCleared(location === null);
    setCityQuery(location?.label ?? '');
  };

  const handleCityQueryChange = useCallback((query: string) => {
    setCityQuery(query);
  }, []);

  const handleStayLocationChange = (location: TripLocation | null) => {
    setStayLocation(location);
    setStayLocationCleared(location === null);
    if (location) {
      setStayLocationQuery(location.label);
    }
  };

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? insets.top + spacing.md : 0),
    [insets.top]
  );

  const handleSave = async () => {
    setError(null);

    const resolvedCity = (() => {
      if (city) return city;
      if (cityQuery.trim().length >= 2) {
        return tripLocationFromManual(cityQuery.trim());
      }
      if (isEditing && !cityCleared && initialCityRef.current) {
        return initialCityRef.current;
      }
      return null;
    })();

    let resolvedStayLocation: TripLocation | null =
      stayLocation ??
      (isEditing && initialBlock?.stay && !stayLocationCleared
        ? initialStayLocationRef.current
        : null);

    if (!hasStayLocation(resolvedStayLocation) && stayLocationQuery.trim().length >= 2) {
      resolvedStayLocation = tripLocationFromManual(stayLocationQuery.trim());
    }

    const hasResolvedStay = hasStayLocation(resolvedStayLocation);

    const stay = hasResolvedStay
      ? {
          title: resolvedStayLocation!.label.trim(),
          location: resolvedStayLocation!,
          checkInTime,
          checkOutTime,
          notes: stayNotes.trim() || undefined,
        }
      : undefined;

    const input: TripStayInput = {
      city: resolvedCity,
      stay,
      startDateKey,
      endDateKey,
    };

    try {
      validateTripStayInput(input, trip.startDate, trip.endDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      return;
    }

    setSaving(true);
    try {
      await onSave(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
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
      <Text style={styles.title}>{isEditing ? 'Edit City & Stay' : 'Add City & Stay'}</Text>
      <Text style={styles.subtitle}>
        Choose a city and date range for this block. Add an optional stay to create check-in /
        check-out plan items.
      </Text>

      <View style={styles.form}>
        <LocationSearchField
          label="City (required)"
          value={city}
          onChange={handleCityChange}
          onQueryChange={handleCityQueryChange}
          scope="region"
          near={tripDestination}
          placeholder="Search city or area"
          allowManual
        />

        <LocationSearchField
          label="Stay location (optional)"
          value={stayLocation}
          onChange={handleStayLocationChange}
          onQueryChange={handleStayLocationQueryChange}
          scope="place"
          near={staySearchNear}
          allowDeviceFallback={!staySearchNear}
          placeholder="Search hotel, address, or neighborhood"
          allowManual
        />

        <DateRangePickerField
          label="Dates"
          sheetTitle="Dates"
          startDate={startDateKey}
          endDate={endDateKey}
          onStartDateChange={setStartDateKey}
          onEndDateChange={setEndDateKey}
          getRangeError={getTripDateRangeError}
          formatDayCountLabel={formatTripDayCountLabel}
        />

        {showStayTimes ? (
          <>
            <TripTimeRangeField
              startTime={checkInTime}
              endTime={checkOutTime}
              onStartTimeChange={setCheckInTime}
              onEndTimeChange={setCheckOutTime}
              startLabel="Check in"
              endLabel="Check out"
              defaultStartTime="15:00"
              defaultEndTime="11:00"
              allowEndBeforeStart
            />
            <Input
              label="Notes"
              value={stayNotes}
              onChangeText={setStayNotes}
              placeholder="Confirmation, room type…"
              multiline
              numberOfLines={2}
              style={styles.notesInput}
            />
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <CancelButton onPress={onClose} disabled={saving} />
          <Button title="Save" onPress={handleSave} loading={saving} />
        </View>
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
  form: {
    gap: spacing.sm,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
