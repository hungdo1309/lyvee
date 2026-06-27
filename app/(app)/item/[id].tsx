import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { appAlert } from '../../../src/utils/dialog';
import { useLocalSearchParams } from 'expo-router';
import { parseISO } from 'date-fns';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { ItemFormOptions } from '../../../src/components/ItemFormOptions';
import { TagInput } from '../../../src/components/TagInput';
import { GroupPicker } from '../../../src/components/GroupPicker';
import { ItemDateTimeField } from '../../../src/components/ItemDateTimeField';
import { ReminderPicker } from '../../../src/components/ReminderPicker';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { updateItem, deleteItem, toggleItemComplete } from '../../../src/services/items';
import { colors, spacing, radius, itemTypeConfig, itemTypeSupportsRecurring } from '../../../src/constants/theme';
import { itemFormLayout } from '../../../src/constants/itemFormLayout';
import {
  ItemType,
  ItemVisibility,
  ItemReminderOffset,
  RecurringRule,
  DEFAULT_RECURRING_RULE,
  defaultReminderForType,
} from '../../../src/types';
import { normalizeReminderOffset, resolveItemReminderOffset } from '../../../src/utils/reminders';
import { toISODateTime } from '../../../src/utils/dates';
import { getItemTags } from '../../../src/utils/tags';
import {
  canUserEditItem,
  canUserViewItem,
} from '../../../src/utils/itemVisibility';
import { canUserCompleteTask } from '../../../src/utils/assignees';
import { toOccurrenceKey } from '../../../src/utils/recurrence';
import { dismissItemFlow } from '../../../src/utils/navigation';
import { ItemFormScreen } from '../../../src/components/ItemFormScreen';
import { HeaderSaveButton } from '../../../src/components/HeaderSaveButton';
import { HeaderCancelButton } from '../../../src/components/HeaderCancelButton';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import { ItemComments } from '../../../src/components/ItemComments';

export default function ItemDetailScreen() {
  const { id, edit, commentId, occurrence } = useLocalSearchParams<{
    id: string;
    edit?: string;
    commentId?: string;
    occurrence?: string;
  }>();
  const { user } = useAuth();
  const { items, groups } = useApp();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const canEdit = item ? canUserEditItem(item, user?.id) : false;
  const canView = item ? canUserViewItem(item, user?.id) : false;
  const itemGroup = groups.find((g) => g.id === item?.groupId);
  const { members: groupMembers } = useGroupMembers(itemGroup?.members ?? []);
  const visibilityMembers = useMemo(
    () => groupMembers.filter((m) => m.id !== user?.id),
    [groupMembers, user]
  );

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [type, setType] = useState<ItemType>('task');
  const [visibility, setVisibility] = useState<ItemVisibility>('everyone');
  const [allowedMembers, setAllowedMembers] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [recurringRule, setRecurringRule] = useState<RecurringRule>(DEFAULT_RECURRING_RULE);
  const [hasDate, setHasDate] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  const [reminderOffset, setReminderOffset] = useState<ItemReminderOffset>('none');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(edit === '1');

  const viewingOccurrence = typeof occurrence === 'string' ? occurrence : undefined;
  const canComplete = item ? canUserCompleteTask(item, user?.id) : false;
  const isCompleted = useMemo(() => {
    if (!item || item.type !== 'task') return false;
    if (item.recurringRule.frequency !== 'none' && viewingOccurrence) {
      return (item.completedOccurrences ?? []).includes(toOccurrenceKey(viewingOccurrence));
    }
    return item.completed;
  }, [item, viewingOccurrence]);

  const resetForm = useCallback(() => {
    if (!item) return;
    setTitle(item.title);
    setTags(getItemTags(item));
    setType(item.type);
    setVisibility(item.visibility);
    setAllowedMembers(item.allowedMembers);
    setAssignedTo(item.assignedTo);
    setRecurringRule(item.recurringRule);
    setHasDate(!!item.dateTime);
    setDateTime(item.dateTime ? parseISO(item.dateTime) : new Date());
    setReminderOffset(resolveItemReminderOffset(item));
  }, [item]);

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    setIsEditing(edit === '1');
  }, [edit, id]);

  const handleCancelEdit = useCallback(() => {
    resetForm();
    setIsEditing(false);
  }, [resetForm]);

  const handleDelete = useCallback(async () => {
    if (!item || !canEdit) return;
    setDeleting(true);
    try {
      await deleteItem(item.id, user?.id, item);
      dismissItemFlow();
    } catch (error: unknown) {
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete item'
      );
    } finally {
      setDeleting(false);
    }
  }, [item, canEdit, user?.id]);

  const handleToggleComplete = useCallback(async () => {
    if (!item || !canComplete || item.type !== 'task') return;
    setCompleting(true);
    try {
      await toggleItemComplete(
        item,
        item.recurringRule.frequency !== 'none' ? viewingOccurrence : undefined,
        user?.id
      );
    } catch (error: unknown) {
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update task'
      );
    } finally {
      setCompleting(false);
    }
  }, [item, canComplete, viewingOccurrence, user?.id, itemGroup?.members]);

  const handleDeletePress = useCallback(() => {
    if (!item || !canEdit) return;
    appAlert(
      'Delete this item?',
      `"${item.title}" will be permanently removed and can't be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  }, [item, canEdit, handleDelete]);

  const handleTypeChange = (next: ItemType) => {
    setType(next);
    if (!itemTypeSupportsRecurring(next)) {
      setRecurringRule(DEFAULT_RECURRING_RULE);
    }
    if (hasDate && item?.reminderOffset === undefined) {
      setReminderOffset(defaultReminderForType(next));
    }
  };

  const handleSave = useCallback(async () => {
    if (!item || !canEdit) return;
    if (!title.trim()) {
      appAlert('Error', 'Title is required');
      return;
    }
    if (visibility === 'custom' && allowedMembers.length === 0) {
      appAlert('Error', 'Select at least one member for custom visibility');
      return;
    }
    setLoading(true);
    try {
      await updateItem(
        item.id,
        {
          title: title.trim(),
          type,
          visibility,
          allowedMembers: visibility === 'custom' ? allowedMembers : [],
          assignedTo,
          recurringRule: itemTypeSupportsRecurring(type)
            ? recurringRule
            : DEFAULT_RECURRING_RULE,
          tags,
          dateTime: hasDate ? toISODateTime(dateTime) : null,
          reminderOffset: normalizeReminderOffset(hasDate, type, reminderOffset),
        },
        user?.id,
        true,
        item,
        itemGroup?.members
      );
      setIsEditing(false);
    } catch (error: unknown) {
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update item'
      );
    } finally {
      setLoading(false);
    }
  }, [
    item,
    canEdit,
    title,
    type,
    visibility,
    allowedMembers,
    assignedTo,
    recurringRule,
    tags,
    hasDate,
    dateTime,
    reminderOffset,
    user?.id,
  ]);

  if (!item) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Item not found</Text>
        <Button title="Go Back" variant="secondary" onPress={() => dismissItemFlow()} />
      </View>
    );
  }

  if (!canView) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>You do not have access to this item.</Text>
        <Button title="Go Back" variant="secondary" onPress={() => dismissItemFlow()} />
      </View>
    );
  }

  const readOnly = !isEditing;

  return (
    <ItemFormScreen
      title={isEditing ? 'Edit Item' : 'View Item'}
      leftAction={
        isEditing ? (
          <HeaderCancelButton onPress={handleCancelEdit} />
        ) : (
          <ScreenBackButton
            label="Back to Home"
            showChevron
            onPress={() => dismissItemFlow()}
            style={styles.headerBackButton}
          />
        )
      }
      rightAction={
        isEditing ? (
          <HeaderSaveButton onPress={handleSave} loading={loading} />
        ) : canEdit ? (
          <HeaderSaveButton label="Edit" onPress={() => setIsEditing(true)} />
        ) : undefined
      }
    >
      {itemGroup && (
        <GroupPicker
          groupId={item.groupId}
          groups={[itemGroup]}
          readOnly
        />
      )}
      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        editable={!readOnly}
      />
      {readOnly && item.type === 'task' ? (
        <View style={styles.completeSection}>
          <Text style={styles.sectionLabel}>Status</Text>
          <TouchableOpacity
            style={[
              styles.completeRow,
              !canComplete && styles.completeRowDisabled,
            ]}
            onPress={handleToggleComplete}
            disabled={!canComplete || completing}
            activeOpacity={canComplete ? 0.85 : 1}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted, disabled: !canComplete || completing }}
            accessibilityLabel={isCompleted ? 'Task completed' : 'Mark task as complete'}
          >
            <View style={[styles.checkbox, isCompleted && styles.checkboxDone]}>
              {isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text
              style={[
                styles.completeLabel,
                isCompleted && styles.completeLabelDone,
                !canComplete && styles.completeLabelDisabled,
              ]}
            >
              {isCompleted ? 'Completed' : 'Mark as complete'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <TagInput tags={tags} onChange={setTags} readOnly={readOnly} />
      <ItemFormOptions
        type={type}
        visibility={visibility}
        recurringRule={recurringRule}
        onTypeChange={handleTypeChange}
        onVisibilityChange={(v) => {
          setVisibility(v);
          if (v !== 'custom') setAllowedMembers([]);
        }}
        onRecurringChange={setRecurringRule}
        groupMembers={groupMembers}
        assignedTo={assignedTo}
        onAssignedToChange={setAssignedTo}
        visibilityMembers={visibilityMembers}
        allowedMembers={allowedMembers}
        onAllowedMembersChange={setAllowedMembers}
        readOnly={readOnly}
      />
      <View style={styles.dateSection}>
        {!readOnly ? (
          <View style={styles.dateHeader}>
            <Text style={styles.sectionLabel}>{itemTypeConfig[type].dateTimeLabel}</Text>
            <TouchableOpacity
              onPress={() => {
                if (hasDate) {
                  setHasDate(false);
                  setReminderOffset('none');
                } else {
                  setHasDate(true);
                  setReminderOffset(defaultReminderForType(type));
                }
              }}
            >
              <Text style={styles.toggle}>
                {hasDate ? 'Remove date' : 'Add date'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : hasDate ? (
          <Text style={styles.sectionLabel}>{itemTypeConfig[type].dateTimeLabel}</Text>
        ) : (
          <View style={styles.readOnlyBlock}>
            <Text style={styles.sectionLabel}>{itemTypeConfig[type].dateTimeLabel}</Text>
            <Text style={styles.readOnlyValue}>No date set</Text>
          </View>
        )}
        {hasDate && (
          <>
            <ItemDateTimeField
              value={dateTime}
              onChange={setDateTime}
              dateOnly={type === 'document'}
              sheetTitle={itemTypeConfig[type].dateTimeLabel}
              readOnly={readOnly}
            />
            <ReminderPicker
              value={reminderOffset}
              onChange={setReminderOffset}
              assignedTo={assignedTo}
              groupMembers={groupMembers}
              readOnly={readOnly}
            />
          </>
        )}
      </View>
      <ItemComments
        item={item}
        groupMembers={groupMembers}
        groupMemberIds={itemGroup?.members ?? []}
        currentUserId={user?.id}
        focusCommentId={typeof commentId === 'string' ? commentId : undefined}
        compactBottom={canEdit && !isEditing}
      />
      {canEdit && !isEditing ? (
        <View style={styles.deleteSection}>
          <Button
            title="Delete"
            variant="cancel"
            onPress={handleDeletePress}
            loading={deleting}
            disabled={deleting}
            style={styles.deleteButton}
          />
        </View>
      ) : null}
    </ItemFormScreen>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: itemFormLayout.horizontalPadding,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  headerBackButton: {
    marginBottom: 0,
  },
  deleteSection: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  deleteButton: {
    alignSelf: 'stretch',
  },
  dateSection: {
    marginBottom: spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggle: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  readOnlyBlock: {
    marginBottom: spacing.sm,
  },
  readOnlyValue: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  completeSection: {
    marginBottom: spacing.md,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  completeRowDisabled: {
    opacity: 0.72,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  completeLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  completeLabelDone: {
    color: colors.textSecondary,
  },
  completeLabelDisabled: {
    color: colors.textMuted,
  },
});
