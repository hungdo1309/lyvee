import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Trip } from '../types/trips';
import {
  buildStayBlockDisplayLabel,
  collectTripStayBlocks,
  TripStayBlockRecord,
} from '../utils/tripStayEntries';
import { TripStayInput } from '../utils/tripStays';
import { TripStayEditor } from './TripStayEditor';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { InlineConfirmPanel } from './InlineConfirmPanel';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { colors, radius, spacing, typography } from '../constants/theme';

interface TripStaysEditorProps {
  visible: boolean;
  trip: Trip;
  tripDestination?: string | null;
  onClose: () => void;
  onSaveStay: (input: TripStayInput, previousBlock?: TripStayBlockRecord | null) => Promise<void>;
  onDeleteStayBlock: (block: TripStayBlockRecord) => Promise<void>;
}

function formatStayDateRange(startDateKey: string, endDateKey: string): string {
  const startLabel = format(parseISO(startDateKey), 'MMM d');
  if (startDateKey === endDateKey) return startLabel;
  const endLabel = format(parseISO(endDateKey), 'MMM d');
  return `${startLabel} – ${endLabel}`;
}

export function TripStaysEditor({
  visible,
  trip,
  tripDestination,
  onClose,
  onSaveStay,
  onDeleteStayBlock,
}: TripStaysEditorProps) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TripStayBlockRecord | null>(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<TripStayBlockRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const editingBlockRef = useRef<TripStayBlockRecord | null>(null);

  const stayBlocks = useMemo(() => collectTripStayBlocks(trip.days), [trip.days]);

  useEffect(() => {
    if (!visible) {
      setFormVisible(false);
      setEditingBlock(null);
      editingBlockRef.current = null;
      setConfirmDeleteBlock(null);
      setDeleteError(null);
      setDeleting(false);
    }
  }, [visible]);

  const openAddStay = () => {
    editingBlockRef.current = null;
    setEditingBlock(null);
    setFormVisible(true);
  };

  const openEditStay = (block: TripStayBlockRecord) => {
    editingBlockRef.current = block;
    setEditingBlock(block);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingBlock(null);
    editingBlockRef.current = null;
  };

  const handleSaveFromEditor = async (input: TripStayInput) => {
    await onSaveStay(input, editingBlockRef.current);
  };

  const handleDeleteStay = (block: TripStayBlockRecord) => {
    setDeleteError(null);
    setConfirmDeleteBlock(block);
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setConfirmDeleteBlock(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteBlock) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteStayBlock(confirmDeleteBlock);
      setConfirmDeleteBlock(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteMessage = confirmDeleteBlock
    ? (() => {
        const label = buildStayBlockDisplayLabel(confirmDeleteBlock);
        const rangeLabel = formatStayDateRange(
          confirmDeleteBlock.startDateKey,
          confirmDeleteBlock.endDateKey
        );
        const removalDetail = confirmDeleteBlock.stay
          ? 'Its check-in / check-out plan items will also be removed. Other plan items stay on your trip.'
          : 'The city details for those days will be removed. Other plan items stay on your trip.';
        return `"${label}" (${rangeLabel}). ${removalDetail}`;
      })()
    : '';

  return (
    <>
      <ModalBottomSheet visible={visible && !formVisible} onClose={onClose}>
        <View style={modalBottomSheetStyles.handle} />
        <Text style={styles.title}>City & Stay</Text>
        <Text style={styles.subtitle}>
          Manage cities and optional stays for this trip. Stays add check-in / check-out plan items.
        </Text>

        {confirmDeleteBlock ? (
          <InlineConfirmPanel
            title={confirmDeleteBlock.stay ? 'Remove stay?' : 'Remove city?'}
            message={confirmDeleteMessage}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            loading={deleting}
            error={deleteError}
          />
        ) : null}

        {!confirmDeleteBlock && stayBlocks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="hotel" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No cities yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a city and date range. Optionally include a stay for check-in and check-out plan
              items.
            </Text>
          </View>
        ) : !confirmDeleteBlock ? (
          <View style={styles.stayList}>
            {stayBlocks.map((block) => (
              <View key={block.blockKey} style={styles.stayCard}>
                <TouchableOpacity
                  style={styles.stayCardBody}
                  onPress={() => openEditStay(block)}
                  accessibilityLabel={`Edit ${buildStayBlockDisplayLabel(block)}`}
                >
                  <View style={styles.stayCardHeader}>
                    <MaterialIcons name="hotel" size={18} color={colors.primaryDark} />
                    <Text style={styles.stayLabel}>{buildStayBlockDisplayLabel(block)}</Text>
                  </View>
                  {block.city?.label && block.stay ? (
                    <Text style={styles.stayCity}>{block.city.label}</Text>
                  ) : null}
                  <Text style={styles.stayDates}>
                    {formatStayDateRange(block.startDateKey, block.endDateKey)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteStay(block)}
                  accessibilityLabel={`Remove ${buildStayBlockDisplayLabel(block)}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <CancelButton onPress={onClose} disabled={deleting} />
          {!confirmDeleteBlock ? (
            <Button title="Add City & Stay" onPress={openAddStay} />
          ) : null}
        </View>
      </ModalBottomSheet>

      <TripStayEditor
        visible={visible && formVisible}
        trip={trip}
        tripDestination={tripDestination}
        initialBlock={editingBlock}
        onClose={closeForm}
        onSave={handleSaveFromEditor}
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
  stayList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stayCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  stayCardBody: {
    flex: 1,
    padding: spacing.mdTight,
    gap: 4,
  },
  stayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stayLabel: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  stayCity: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  stayDates: {
    ...typography.caption,
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
