import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip } from '../types/trips';
import { TripLocation } from '../types/places';
import { TripFlightInput } from '../utils/tripFlights';
import { TripFlightRecord, tripFlightRecordToInput } from '../utils/tripFlightEntries';
import { Input } from './Input';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { LocationSearchField } from './LocationSearchField';
import { ItemDateTimeField } from './ItemDateTimeField';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { colors, spacing, typography } from '../constants/theme';

interface TripFlightEditorProps {
  visible: boolean;
  trip: Trip;
  searchNear?: string | null;
  initialFlight?: TripFlightRecord | null;
  onClose: () => void;
  onSave: (input: TripFlightInput, flightKey?: string) => Promise<void>;
}

export function TripFlightEditor({
  visible,
  trip,
  searchNear,
  initialFlight,
  onClose,
  onSave,
}: TripFlightEditorProps) {
  const insets = useSafeAreaInsets();
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [departLocation, setDepartLocation] = useState<TripLocation | null>(null);
  const [arriveLocation, setArriveLocation] = useState<TripLocation | null>(null);
  const [departAt, setDepartAt] = useState(() => parseISO(trip.startDate));
  const [arriveAt, setArriveAt] = useState(() => parseISO(trip.startDate));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialFlight);

  useEffect(() => {
    if (!visible) return;
    if (initialFlight) {
      const input = tripFlightRecordToInput(initialFlight);
      setAirline(input.airline ?? '');
      setFlightNumber(input.flightNumber ?? '');
      setDepartLocation(input.departLocation);
      setArriveLocation(input.arriveLocation);
      setDepartAt(input.departAt);
      setArriveAt(input.arriveAt);
      setNotes(input.notes ?? '');
    } else {
      const defaultDepart = parseISO(trip.startDate);
      defaultDepart.setHours(8, 0, 0, 0);
      const defaultArrive = parseISO(trip.startDate);
      defaultArrive.setHours(11, 0, 0, 0);
      setAirline('');
      setFlightNumber('');
      setDepartLocation(null);
      setArriveLocation(null);
      setDepartAt(defaultDepart);
      setArriveAt(defaultArrive);
      setNotes('');
    }
    setError(null);
    setSaving(false);
  }, [visible, trip.startDate, initialFlight]);

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? insets.top + spacing.md : 0),
    [insets.top]
  );

  const handleSave = async () => {
    setError(null);
    if (!departLocation) {
      setError('Choose a departure airport or city');
      return;
    }
    if (!arriveLocation) {
      setError('Choose an arrival airport or city');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          airline: airline.trim() || undefined,
          flightNumber: flightNumber.trim() || undefined,
          departLocation,
          departAt,
          arriveLocation,
          arriveAt,
          notes: notes.trim() || undefined,
        },
        initialFlight?.flightKey
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save flight');
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
      <Text style={styles.title}>{isEditing ? 'Edit flight' : 'Add flight'}</Text>
      <Text style={styles.subtitle}>
        {isEditing
          ? 'Updates the departure and arrival items on your plan.'
          : 'Adds depart and arrive items to your plan. Dates outside the trip are adjusted automatically.'}
      </Text>

      <View style={styles.form}>
        <View style={styles.flightDetailsRow}>
          <View style={styles.flightDetailsField}>
            <Input
              label="Airline"
              value={airline}
              onChangeText={setAirline}
              placeholder="United, Delta…"
            />
          </View>
          <View style={styles.flightDetailsField}>
            <Input
              label="Flight number"
              value={flightNumber}
              onChangeText={setFlightNumber}
              placeholder="UA 123"
            />
          </View>
        </View>

        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.sectionTitle}>Departure</Text>
          <LocationSearchField
            value={departLocation}
            onChange={setDepartLocation}
            scope="airport"
            near={searchNear}
            placeholder="Search airport name or code"
            allowManual
          />
          <View style={styles.dateTimeGroup}>
            <Text style={styles.fieldLabel}>Departure time</Text>
            <ItemDateTimeField
              value={departAt}
              onChange={setDepartAt}
              sheetTitle="Departure date & time"
            />
          </View>
        </View>

        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.sectionTitle}>Arrival</Text>
          <LocationSearchField
            value={arriveLocation}
            onChange={setArriveLocation}
            scope="airport"
            near={searchNear}
            placeholder="Search airport name or code"
            allowManual
          />
          <View style={styles.dateTimeGroup}>
            <Text style={styles.fieldLabel}>Arrival time</Text>
            <ItemDateTimeField
              value={arriveAt}
              onChange={setArriveAt}
              sheetTitle="Arrival date & time"
            />
          </View>
        </View>

        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Confirmation code, terminal, seat…"
          multiline
          numberOfLines={2}
          style={styles.notesInput}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <CancelButton onPress={onClose} disabled={saving} />
          <Button
            title={isEditing ? 'Save flight' : 'Add flight'}
            onPress={handleSave}
            loading={saving}
          />
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
    gap: 0,
  },
  flightDetailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flightDetailsField: {
    flex: 1,
  },
  sectionSpaced: {
    marginTop: spacing.lg,
  },
  section: {
    gap: 0,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  dateTimeGroup: {
    marginBottom: spacing.md,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
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
