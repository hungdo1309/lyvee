import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Trip } from '../types/trips';
import { TripFlightInput } from '../utils/tripFlights';
import {
  buildFlightDisplayLabel,
  collectTripFlights,
  TripFlightRecord,
} from '../utils/tripFlightEntries';
import { formatTripTime } from '../utils/trips';
import { tripLocationLabel } from '../types/places';
import { TripFlightEditor } from './TripFlightEditor';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { InlineConfirmPanel } from './InlineConfirmPanel';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { colors, radius, spacing, typography } from '../constants/theme';

interface TripFlightsEditorProps {
  visible: boolean;
  trip: Trip;
  searchNear?: string | null;
  onClose: () => void;
  onSaveFlight: (input: TripFlightInput, flightKey?: string) => Promise<void>;
  onDeleteFlight: (flightKey: string) => Promise<void>;
}

function formatFlightDayTime(dateKey: string, time?: string): string {
  const dateLabel = format(parseISO(dateKey), 'MMM d');
  const timeLabel = formatTripTime(time);
  return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
}

export function TripFlightsEditor({
  visible,
  trip,
  searchNear,
  onClose,
  onSaveFlight,
  onDeleteFlight,
}: TripFlightsEditorProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingFlight, setEditingFlight] = useState<TripFlightRecord | null>(null);
  const [confirmDeleteFlight, setConfirmDeleteFlight] = useState<TripFlightRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const flights = useMemo(() => collectTripFlights(trip.days), [trip.days]);

  useEffect(() => {
    if (!visible) {
      setFormVisible(false);
      setEditingFlight(null);
      setConfirmDeleteFlight(null);
      setDeleteError(null);
      setDeleting(false);
    }
  }, [visible]);

  const openAddFlight = () => {
    setEditingFlight(null);
    setFormVisible(true);
  };

  const openEditFlight = (flight: TripFlightRecord) => {
    setEditingFlight(flight);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingFlight(null);
  };

  const handleDeleteFlight = (flight: TripFlightRecord) => {
    setDeleteError(null);
    setConfirmDeleteFlight(flight);
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setConfirmDeleteFlight(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteFlight) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteFlight(confirmDeleteFlight.flightKey);
      setConfirmDeleteFlight(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteMessage = confirmDeleteFlight
    ? `"${buildFlightDisplayLabel(confirmDeleteFlight)}" and its departure and arrival items will be removed from your plan. Other plan items stay on your trip.`
    : '';

  return (
    <>
      <ModalBottomSheet visible={visible && !formVisible} onClose={onClose}>
        <View style={modalBottomSheetStyles.handle} />
        <Text style={styles.title}>Flight</Text>
        <Text style={styles.subtitle}>
          Manage flights for this trip. Changes sync to your day-by-day plan.
        </Text>

        {confirmDeleteFlight ? (
          <InlineConfirmPanel
            title="Remove flight?"
            message={confirmDeleteMessage}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            loading={deleting}
            error={deleteError}
          />
        ) : null}

        {!confirmDeleteFlight && flights.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="airplane-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No flights yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a flight to create departure and arrival plan items.
            </Text>
          </View>
        ) : !confirmDeleteFlight ? (
          <View style={styles.flightList}>
            {flights.map((flight) => (
              <View key={flight.flightKey} style={styles.flightCard}>
                <TouchableOpacity
                  style={styles.flightCardBody}
                  onPress={() => openEditFlight(flight)}
                  accessibilityLabel={`Edit ${buildFlightDisplayLabel(flight)}`}
                >
                  <View style={styles.flightCardHeader}>
                    <Ionicons name="airplane-outline" size={18} color={colors.primaryDark} />
                    <Text style={styles.flightLabel}>{buildFlightDisplayLabel(flight)}</Text>
                  </View>
                  <Text style={styles.flightRoute}>
                    {tripLocationLabel(flight.departLocation)} →{' '}
                    {tripLocationLabel(flight.arriveLocation)}
                  </Text>
                  <Text style={styles.flightTimes}>
                    Depart {formatFlightDayTime(flight.departDateKey, flight.departTime)}
                    {' · '}
                    Arrive {formatFlightDayTime(flight.arriveDateKey, flight.arriveTime)}
                  </Text>
                  {flight.notes ? (
                    <Text style={styles.flightNotes} numberOfLines={2}>
                      {flight.notes}
                    </Text>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFlight(flight)}
                  accessibilityLabel={`Remove ${buildFlightDisplayLabel(flight)}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <CancelButton onPress={onClose} disabled={deleting} />
          {!confirmDeleteFlight ? (
            <Button title="Add flight" onPress={openAddFlight} />
          ) : null}
        </View>
      </ModalBottomSheet>

      <TripFlightEditor
        visible={visible && formVisible}
        trip={trip}
        searchNear={searchNear}
        initialFlight={editingFlight}
        onClose={closeForm}
        onSave={onSaveFlight}
      />
    </>
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
  emptyState: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    ...typography.label,
    fontSize: 15,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  flightList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  flightCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  flightCardBody: {
    flex: 1,
    padding: spacing.mdTight,
    gap: 4,
  },
  flightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flightLabel: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  flightRoute: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  flightTimes: {
    ...typography.caption,
    lineHeight: 18,
  },
  flightNotes: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.errorMuted,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
