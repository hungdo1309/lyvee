import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  NestableDraggableFlatList,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TripDayPlan, TripItineraryEntry } from '../types/trips';
import {
  formatTripDayHeading,
  formatTripEntryLocation,
  formatTripEntryTagLabel,
  formatTripEntryTimeLabel,
  getOverlappingEntryIds,
  getOutOfOrderEntryIds,
  getTripEntryTagIcon,
  getTripEntryTagStyle,
} from '../utils/trips';
import { getTripDayDisplayContext } from '../utils/tripStayEntries';
import { Card } from './Card';
import { colors, radius, spacing, typography } from '../constants/theme';

interface TripDaySectionProps {
  day: TripDayPlan;
  dayNumber: number;
  canEdit: boolean;
  onAddEntry: () => void;
  onEditEntry: (entry: TripItineraryEntry) => void;
  onDeleteEntry: (entry: TripItineraryEntry) => void;
  onReorderEntries?: (entries: TripItineraryEntry[]) => void;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function TripDaySection({
  day,
  dayNumber,
  canEdit,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onReorderEntries,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
}: TripDaySectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? expanded : internalExpanded;

  const setExpanded = (next: boolean | ((current: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(isExpanded) : next;
    if (isControlled) {
      onExpandedChange?.(resolved);
      return;
    }
    setInternalExpanded(resolved);
  };
  const entries = day.entries;
  const overlappingEntryIds = useMemo(() => getOverlappingEntryIds(entries), [entries]);
  const outOfOrderEntryIds = useMemo(() => getOutOfOrderEntryIds(entries), [entries]);
  const hasOverlapping = overlappingEntryIds.size > 0;
  const hasOutOfOrder = outOfOrderEntryIds.size > 0;
  const hasScheduleIssues = hasOverlapping || hasOutOfOrder;
  const displayContext = useMemo(() => getTripDayDisplayContext(day), [day]);
  const hasDayDetails = Boolean(displayContext.cityLabel || displayContext.stayLabel);
  const canReorder = canEdit && Boolean(onReorderEntries);

  const renderEntryCard = (
    entry: TripItineraryEntry,
    drag?: () => void,
    isActive?: boolean
  ) => {
    const tagStyle = getTripEntryTagStyle(entry.tag);
    const timeLabel = formatTripEntryTimeLabel(entry);
    const locationLabel = formatTripEntryLocation(entry);
    const isOverlapping = overlappingEntryIds.has(entry.id);
    const isOutOfOrder = outOfOrderEntryIds.has(entry.id);

    return (
      <Card
        style={[
          styles.entryCard,
          isOverlapping && styles.entryCardOverlap,
          !isOverlapping && isOutOfOrder && styles.entryCardOutOfOrder,
          isActive && styles.entryCardDragging,
        ]}
        onPress={canEdit ? () => onEditEntry(entry) : undefined}
        onLongPress={canReorder && drag ? drag : undefined}
        delayLongPress={200}
        accessibilityLabel="Hold to reorder plan item"
      >
        <View style={styles.entryIcon}>
          <Ionicons
            name={getTripEntryTagIcon(entry.tag) as keyof typeof Ionicons.glyphMap}
            size={18}
            color={colors.primaryDark}
          />
        </View>
        <View style={styles.entryContent}>
          <View style={styles.entryTopRow}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            {canEdit ? (
              <TouchableOpacity
                onPress={() => onDeleteEntry(entry)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete plan item"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.entryMetaRow}>
            <View style={[styles.tagPill, { backgroundColor: tagStyle.backgroundColor, borderColor: tagStyle.color }]}>
              <Text style={[styles.tagPillText, { color: tagStyle.color }]}>
                {formatTripEntryTagLabel(entry.tag)}
              </Text>
            </View>
            {timeLabel ? (
              <Text style={styles.entryMeta}>
                {timeLabel}
                {isOverlapping ? <Text style={styles.overlapLabel}> · Overlapping</Text> : null}
                {isOutOfOrder ? (
                  <Text style={styles.outOfOrderLabel}> · Out of order</Text>
                ) : null}
              </Text>
            ) : null}
          </View>
          {locationLabel ? <Text style={styles.entryPlace}>{locationLabel}</Text> : null}
          {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
        </View>
      </Card>
    );
  };

  const renderDraggableEntry = ({ item, drag, isActive }: RenderItemParams<TripItineraryEntry>) => (
    <ScaleDecorator>
      {renderEntryCard(item, drag, isActive)}
    </ScaleDecorator>
  );

  return (
    <View
      style={[
        styles.section,
        hasOverlapping && styles.sectionOverlap,
        !hasOverlapping && hasOutOfOrder && styles.sectionOutOfOrder,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.header,
          hasOverlapping && styles.headerOverlap,
          !hasOverlapping && hasOutOfOrder && styles.headerOutOfOrder,
        ]}
        onPress={() => setExpanded((current) => !current)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerTextWrap}>
          <Text
            style={[
              styles.dayTitle,
              hasOverlapping && styles.dayTitleIssue,
              !hasOverlapping && hasOutOfOrder && styles.dayTitleOutOfOrder,
            ]}
          >
            {formatTripDayHeading(day.date, dayNumber)}
          </Text>
          {displayContext.cityLabel ? (
            <Text style={styles.dayContext}>{displayContext.cityLabel}</Text>
          ) : null}
          {displayContext.stayLabel ? (
            <Text style={styles.dayContext}>{displayContext.stayLabel}</Text>
          ) : null}
          <Text
            style={[
              styles.dayMeta,
              hasOverlapping && styles.dayMetaIssue,
              !hasOverlapping && hasOutOfOrder && styles.dayMetaOutOfOrder,
            ]}
          >
            {entries.length === 0
              ? 'Nothing planned yet'
              : `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={
            hasOverlapping
              ? colors.error
              : hasOutOfOrder
                ? colors.warning
                : entries.length > 0 || hasDayDetails
                  ? colors.primaryDark
                  : colors.textSecondary
          }
        />
      </TouchableOpacity>

      {isExpanded ? (
        <View style={styles.body}>
          {entries.length === 0 ? (
            <Text style={styles.empty}>Tap add item to start planning this day.</Text>
          ) : canReorder ? (
            <NestableDraggableFlatList
              data={entries}
              keyExtractor={(item) => item.id}
              renderItem={renderDraggableEntry}
              scrollEnabled={false}
              onDragEnd={({ data }) => onReorderEntries?.(data)}
            />
          ) : (
            entries.map((entry) => <View key={entry.id}>{renderEntryCard(entry)}</View>)
          )}

          {canEdit ? (
            <TouchableOpacity style={styles.addButton} onPress={onAddEntry}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primaryDark} />
              <Text style={styles.addButtonText}>Add item</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionOverlap: {
    borderColor: colors.error,
    backgroundColor: colors.errorMuted,
  },
  sectionOutOfOrder: {
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdTight,
  },
  headerOverlap: {
    backgroundColor: colors.errorMuted,
  },
  headerOutOfOrder: {
    backgroundColor: colors.warningMuted,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  dayTitleIssue: {
    color: colors.error,
  },
  dayTitleOutOfOrder: {
    color: colors.warning,
  },
  dayContext: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  dayMeta: {
    ...typography.caption,
  },
  dayMetaIssue: {
    color: colors.error,
    fontWeight: '600',
  },
  dayMetaOutOfOrder: {
    color: colors.warning,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xxs,
    gap: spacing.sm,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  entryCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: 0,
  },
  entryCardOverlap: {
    borderColor: colors.error,
    backgroundColor: colors.errorMuted,
  },
  entryCardOutOfOrder: {
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
  },
  entryCardDragging: {
    opacity: 0.92,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryContent: {
    flex: 1,
    gap: 4,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  entryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  entryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  overlapLabel: {
    color: colors.error,
    fontWeight: '600',
  },
  outOfOrderLabel: {
    color: colors.warning,
    fontWeight: '600',
  },
  entryPlace: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  entryNotes: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryMuted,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});
