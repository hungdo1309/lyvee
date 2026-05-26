import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { appAlert } from '../../../src/utils/dialog';
import { ItemFormScreen } from '../../../src/components/ItemFormScreen';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { ItemFormOptions, ItemTypePicker } from '../../../src/components/ItemFormOptions';
import { TagInput } from '../../../src/components/TagInput';
import { ItemDateTimeField } from '../../../src/components/ItemDateTimeField';
import { GroupPicker } from '../../../src/components/GroupPicker';
import { ReminderPicker } from '../../../src/components/ReminderPicker';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { createItem } from '../../../src/services/items';
import { dismissItemFlow } from '../../../src/utils/navigation';
import { colors, spacing, itemTypeConfig, itemTypeSupportsRecurring } from '../../../src/constants/theme';
import {
  ItemType,
  ItemVisibility,
  ItemReminderOffset,
  RecurringRule,
  DEFAULT_RECURRING_RULE,
  defaultReminderForType,
} from '../../../src/types';
import { normalizeReminderOffset } from '../../../src/utils/reminders';
import { getDefaultItemDateTime, getDefaultItemDateTimeForDate, toISODateTime } from '../../../src/utils/dates';

export default function CreateItemScreen() {
  const { groupId: paramGroupId, date: paramDate } = useLocalSearchParams<{
    groupId?: string;
    date?: string;
  }>();
  const { user } = useAuth();
  const { groups, activeGroup } = useApp();

  const calendarDefaultDateTime = useMemo(
    () =>
      paramDate ? getDefaultItemDateTimeForDate(paramDate) : getDefaultItemDateTime(),
    [paramDate]
  );

  const defaultGroupId = paramGroupId || activeGroup?.id || groups[0]?.id || '';
  const [groupId, setGroupId] = useState(defaultGroupId);
  const selectedGroup = groups.find((g) => g.id === groupId);
  const { members: groupMembers } = useGroupMembers(selectedGroup?.members ?? []);

  useEffect(() => {
    if (!groupId && groups[0]?.id) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  const handleGroupChange = useCallback((nextGroupId: string) => {
    setGroupId(nextGroupId);
    setAssignedTo([]);
    setAllowedMembers([]);
    setVisibility((current) => (current === 'custom' ? 'everyone' : current));
  }, []);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [type, setType] = useState<ItemType>('task');
  const [visibility, setVisibility] = useState<ItemVisibility>('everyone');
  const [allowedMembers, setAllowedMembers] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [recurringRule, setRecurringRule] =
    useState<RecurringRule>(DEFAULT_RECURRING_RULE);
  const [hasDate, setHasDate] = useState(true);
  const [dateTime, setDateTime] = useState(calendarDefaultDateTime);
  const [reminderOffset, setReminderOffset] = useState<ItemReminderOffset>(
    defaultReminderForType('task')
  );
  const [loading, setLoading] = useState(false);

  const visibilityMembers = useMemo(
    () => groupMembers.filter((m) => m.id !== user?.id),
    [groupMembers, user]
  );

  const handleTypeChange = (next: ItemType) => {
    setType(next);
    if (!itemTypeSupportsRecurring(next)) {
      setRecurringRule(DEFAULT_RECURRING_RULE);
    }
    if (hasDate) {
      setReminderOffset(defaultReminderForType(next));
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      appAlert('Error', 'Title is required');
      return;
    }
    if (!user || !groupId) {
      appAlert('Error', 'Please create or select a group first');
      return;
    }
    if (visibility === 'custom' && allowedMembers.length === 0) {
      appAlert('Error', 'Select at least one member for custom visibility');
      return;
    }

    setLoading(true);
    try {
      await createItem(
        {
          groupId,
          title: title.trim(),
          type,
          dateTime: hasDate ? toISODateTime(dateTime) : null,
          recurringRule: itemTypeSupportsRecurring(type)
            ? recurringRule
            : DEFAULT_RECURRING_RULE,
          visibility,
          allowedMembers: visibility === 'custom' ? allowedMembers : [],
          assignedTo,
          notes: notes.trim(),
          tags,
          reminderOffset: normalizeReminderOffset(hasDate, type, reminderOffset),
          completed: false,
          completedOccurrences: [],
        },
        user.id
      );
      dismissItemFlow();
    } catch (error: unknown) {
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create item'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ItemFormScreen title="New Item">
      {groups.length > 0 && (
        <GroupPicker
          groupId={groupId}
          groups={groups}
          onChange={handleGroupChange}
        />
      )}

      <ItemTypePicker type={type} onTypeChange={handleTypeChange} />

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder={itemTypeConfig[type].titlePlaceholder}
      />

      <TagInput tags={tags} onChange={setTags} />

      <ItemFormOptions
        hideType
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
                setDateTime(calendarDefaultDateTime);
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
        placeholder="Additional details..."
        multiline
        numberOfLines={3}
        style={styles.notesInput}
      />

      <Button title="Create" onPress={handleCreate} loading={loading} size="lg" />
    </ItemFormScreen>
  );
}

const styles = StyleSheet.create({
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
