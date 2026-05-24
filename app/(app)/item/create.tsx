import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { KeyboardAwareScrollView } from '../../../src/components/KeyboardAwareScrollView';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { ItemFormOptions, ItemTypePicker } from '../../../src/components/ItemFormOptions';
import { TagInput } from '../../../src/components/TagInput';
import { ItemDateTimeField } from '../../../src/components/ItemDateTimeField';
import { GroupPicker } from '../../../src/components/GroupPicker';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { createItem } from '../../../src/services/items';
import { dismissItemFlow } from '../../../src/utils/navigation';
import { colors, spacing, itemTypeConfig, itemTypeSupportsRecurring } from '../../../src/constants/theme';
import {
  ItemType,
  ItemVisibility,
  RecurringRule,
  DEFAULT_RECURRING_RULE,
} from '../../../src/types';
import { getDefaultItemDateTime, toISODateTime } from '../../../src/utils/dates';

export default function CreateItemScreen() {
  const { groupId: paramGroupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const { groups, activeGroup } = useApp();

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
  const [dateTime, setDateTime] = useState(getDefaultItemDateTime);
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
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!user || !groupId) {
      Alert.alert('Error', 'Please create or select a group first');
      return;
    }
    if (visibility === 'custom' && allowedMembers.length === 0) {
      Alert.alert('Error', 'Select at least one member for custom visibility');
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
          completed: false,
          completedOccurrences: [],
        },
        user.id
      );
      dismissItemFlow();
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create item'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
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
              } else {
                setDateTime(getDefaultItemDateTime());
                setHasDate(true);
              }
            }}
          >
            <Text style={styles.toggle}>
              {hasDate ? 'Remove date' : 'Add date'}
            </Text>
          </TouchableOpacity>
        </View>

        {hasDate && (
          <ItemDateTimeField value={dateTime} onChange={setDateTime} />
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
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
