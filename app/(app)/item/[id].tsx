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
import { updateItem } from '../../../src/services/items';
import { colors, spacing, itemTypeConfig, itemTypeSupportsRecurring } from '../../../src/constants/theme';
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
import { dismissItemFlow } from '../../../src/utils/navigation';
import { ItemFormScreen } from '../../../src/components/ItemFormScreen';
import { HeaderSaveButton } from '../../../src/components/HeaderSaveButton';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { items, groups } = useApp();

  const item = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const isOwner = item?.createdBy === user?.id;
  const itemGroup = groups.find((g) => g.id === item?.groupId);
  const { members: groupMembers } = useGroupMembers(itemGroup?.members ?? []);
  const visibilityMembers = useMemo(
    () => groupMembers.filter((m) => m.id !== user?.id),
    [groupMembers, user]
  );

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
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

  const resetForm = useCallback(() => {
    if (!item) return;
    setTitle(item.title);
    setNotes(item.notes);
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
    if (!item) return;
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
          notes: notes.trim(),
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
        item
      );
      dismissItemFlow();
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
    title,
    notes,
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

  if (!isOwner) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>You can only edit items you created.</Text>
        <Button title="Go Back" variant="secondary" onPress={() => dismissItemFlow()} />
      </View>
    );
  }

  return (
    <ItemFormScreen
      title="Edit Item"
      rightAction={
        <HeaderSaveButton onPress={handleSave} loading={loading} />
      }
    >
      {itemGroup && (
        <GroupPicker
          groupId={item.groupId}
          groups={[itemGroup]}
          readOnly
        />
      )}
      <Input label="Title" value={title} onChangeText={setTitle} />
      <TagInput tags={tags} onChange={setTags} />
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
      />
      <View style={styles.dateSection}>
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
        {hasDate && (
          <>
            <ItemDateTimeField
              value={dateTime}
              onChange={setDateTime}
              dateOnly={type === 'document'}
              sheetTitle={itemTypeConfig[type].dateTimeLabel}
            />
            <ReminderPicker
              value={reminderOffset}
              onChange={setReminderOffset}
              assignedTo={assignedTo}
              groupMembers={groupMembers}
            />
          </>
        )}
      </View>
      <Input
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={styles.notesInput}
      />
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
