import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip } from '../types/trips';
import { User } from '../types';
import { MemberSearchAddField } from './MemberSearchAddField';
import { Button } from './Button';
import { CancelButton } from './CancelButton';
import { ModalBottomSheet, modalBottomSheetStyles } from './ModalBottomSheet';
import { colors, spacing, typography } from '../constants/theme';

interface TripMembersEditorProps {
  visible: boolean;
  trip: Trip;
  groupMembers: User[];
  readOnly?: boolean;
  onClose: () => void;
  onSave: (memberIds: string[]) => Promise<void>;
}

export function TripMembersEditor({
  visible,
  trip,
  groupMembers,
  readOnly = false,
  onClose,
  onSave,
}: TripMembersEditorProps) {
  const insets = useSafeAreaInsets();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripMemberIdsKey = useMemo(() => trip.memberIds.join(','), [trip.memberIds]);

  useEffect(() => {
    if (!visible) return;
    setMemberIds(
      trip.memberIds.length > 0 ? trip.memberIds : [trip.createdBy]
    );
    setError(null);
    setSaving(false);
  }, [visible, tripMemberIdsKey, trip.createdBy]);

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? insets.top + spacing.md : 0),
    [insets.top]
  );

  const handleSave = async () => {
    setError(null);
    if (memberIds.length === 0) {
      setError('Add at least one group member');
      return;
    }

    setSaving(true);
    try {
      await onSave(memberIds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update trip members');
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
      <Text style={styles.title}>Trip members</Text>
      <Text style={styles.subtitle}>Only selected members can see this trip.</Text>

      <MemberSearchAddField
        members={groupMembers}
        selectedIds={memberIds}
        onChange={setMemberIds}
        label="Trip members"
        placeholder="Search group members to add"
        emptyMessage="Add members to your group to share this trip."
        readOnly={readOnly}
        lockedIds={[trip.createdBy]}
        helperText="Group owners and admins can always see every trip."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <CancelButton onPress={onClose} disabled={saving} />
        {readOnly ? null : (
          <Button title="Save members" onPress={handleSave} loading={saving} />
        )}
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
