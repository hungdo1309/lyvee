import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { appAlert } from '../utils/dialog';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addMonths } from 'date-fns';
import { ItemInstance, expandItem, isOverdueCalendarInstance } from '../utils/itemInstances';
import { colors, itemTypeConfig, radius, spacing, itemTypeSupportsRecurring } from '../constants/theme';
import { formatItemDate, formatItemDateShort } from '../utils/dates';
import { formatRecurringLabel, toOccurrenceKey } from '../utils/recurrence';
import { getItemTags } from '../utils/tags';
import { Card } from './Card';
import { TagPills } from './TagPills';
import { Button } from './Button';

interface ItemCardProps {
  instance: ItemInstance;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete?: () => void;
  faded?: boolean;
  assigneeLabel?: string | null;
  groupName?: string;
  isOwner?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ItemCard = React.memo(function ItemCard({
  instance,
  expanded,
  onToggleExpand,
  onToggleComplete,
  faded,
  assigneeLabel,
  groupName,
  isOwner = false,
  onView,
  onEdit,
  onDelete,
}: ItemCardProps) {
  const { item } = instance;
  const config = itemTypeConfig[item.type];
  const tags = getItemTags(item);
  const isRecurring = item.recurringRule.frequency !== 'none';
  const viewingOccurrence = instance.occurrenceDate || undefined;

  const occurrenceCompleted = useMemo(() => {
    if (isRecurring && viewingOccurrence) {
      return (item.completedOccurrences ?? []).includes(toOccurrenceKey(viewingOccurrence));
    }
    return item.completed;
  }, [isRecurring, viewingOccurrence, item.completed, item.completedOccurrences]);

  const upcomingInstances = useMemo(() => {
    if (!item.dateTime || !isRecurring) return [];
    const now = new Date();
    return expandItem(item, now, addMonths(now, 3)).slice(0, 8);
  }, [item, isRecurring]);

  const displayDate = viewingOccurrence ?? item.dateTime;
  const isOverdue = isOverdueCalendarInstance(instance);

  const handleDeletePress = () => {
    if (!onDelete) return;
    appAlert(
      'Delete this item?',
      `"${item.title}" will be permanently removed and can't be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete item', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const showOwnerActions = isOwner && (!!onEdit || !!onDelete);

  const headerRight = showOwnerActions ? (
    <View style={styles.actions}>
      {onEdit && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Edit item"
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
      {onDelete && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDeletePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Delete item"
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  ) : null;

  return (
    <Card
      onPress={onView ?? onToggleExpand}
      style={[
        instance.completed ? styles.completed : undefined,
        faded && styles.faded,
        expanded && styles.expanded,
      ]}
    >
      <View style={styles.row}>
        {item.type === 'task' && onToggleComplete && (
          <TouchableOpacity
            style={[styles.checkbox, instance.completed && styles.checkboxDone]}
            onPress={onToggleComplete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {instance.completed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
              <Text style={[styles.typeText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            {headerRight}
          </View>

          <Text
            style={[
              styles.title,
              instance.completed && styles.titleCompleted,
              isOverdue && !instance.completed && styles.titleOverdue,
            ]}
            numberOfLines={expanded ? undefined : 2}
          >
            {item.title}
          </Text>

          {displayDate ? (
            <Text style={styles.itemDate} numberOfLines={1}>
              {expanded ? formatItemDate(displayDate) : formatItemDateShort(displayDate)}
            </Text>
          ) : null}

          {!expanded && assigneeLabel ? (
            <Text style={styles.assignee}>Assigned to {assigneeLabel}</Text>
          ) : null}

          {!expanded && instance.isRecurring && itemTypeSupportsRecurring(item.type) && (
            <Text style={styles.recurring}>
              {formatRecurringLabel(item.recurringRule)}
            </Text>
          )}

          {expanded && (
            <View style={styles.expandedSection}>
              {itemTypeSupportsRecurring(item.type) && (
                <Text style={styles.meta}>
                  Repeats: {formatRecurringLabel(item.recurringRule)}
                </Text>
              )}
              <Text style={styles.meta}>
                Visibility:{' '}
                {item.visibility.charAt(0).toUpperCase() + item.visibility.slice(1)}
              </Text>
              {groupName && <Text style={styles.meta}>Group: {groupName}</Text>}
              {item.visibility === 'custom' && item.allowedMembers.length > 0 && (
                <Text style={styles.meta}>
                  Shared with {item.allowedMembers.length} member
                  {item.allowedMembers.length !== 1 ? 's' : ''}
                </Text>
              )}
              {assigneeLabel ? (
                <Text style={styles.meta}>Assigned to {assigneeLabel}</Text>
              ) : (
                <Text style={styles.metaMuted}>Unassigned</Text>
              )}

              {tags.length > 0 ? (
                <View style={styles.tagsBlock}>
                  <Text style={styles.sectionLabel}>Tags</Text>
                  <TagPills tags={tags} />
                </View>
              ) : null}

              {upcomingInstances.length > 0 && (
                <View style={styles.upcomingBlock}>
                  <Text style={styles.sectionLabel}>Upcoming</Text>
                  {upcomingInstances.map((inst) => (
                    <Text key={inst.instanceKey} style={styles.upcomingRow}>
                      {formatItemDate(inst.occurrenceDate)}
                      {inst.completed ? ' · Done' : ''}
                    </Text>
                  ))}
                </View>
              )}

              {item.type === 'task' && onToggleComplete && (
                <Button
                  title={occurrenceCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                  variant="secondary"
                  onPress={onToggleComplete}
                  style={styles.completeButton}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  completed: {
    opacity: 0.55,
  },
  faded: {
    opacity: 0.72,
  },
  expanded: {
    borderColor: colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm / 2,
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm / 4,
    borderRadius: radius.sm,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemDate: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  titleOverdue: {
    color: colors.error,
  },
  tagsBlock: {
    marginTop: spacing.md,
  },
  assignee: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  recurring: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metaMuted: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  upcomingBlock: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upcomingRow: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.xs / 2,
  },
  completeButton: {
    marginTop: spacing.md,
  },
});
