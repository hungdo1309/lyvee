import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { ItemFormScreen } from '../../../src/components/ItemFormScreen';
import { GroupPicker } from '../../../src/components/GroupPicker';
import { DateRangePickerField } from '../../../src/components/DateRangePickerField';
import { DestinationSearchField } from '../../../src/components/DestinationSearchField';
import { HeaderSaveButton } from '../../../src/components/HeaderSaveButton';
import { MemberSearchAddField } from '../../../src/components/MemberSearchAddField';
import { createTrip } from '../../../src/services/trips';
import { useGroupMembers, EMPTY_MEMBER_IDS } from '../../../src/hooks/useGroupMembers';
import { TripLocation } from '../../../src/types/places';
import {
  formatTripDateKey,
  formatTripDayCountLabel,
  getTripDateRangeError,
  isValidDestination,
  isValidTripDateRange,
} from '../../../src/utils/trips';
import { addDays, startOfDay } from 'date-fns';
import { colors, spacing } from '../../../src/constants/theme';

export default function CreateTripScreen() {
  const { user } = useAuth();
  const { groups, activeGroup } = useApp();
  const today = startOfDay(new Date());
  const defaultStart = formatTripDateKey(today);
  const defaultEnd = formatTripDateKey(addDays(today, 2));

  const [groupId, setGroupId] = useState(activeGroup?.id ?? groups[0]?.id ?? '');
  const selectedGroup = groups.find((group) => group.id === groupId);
  const { members: groupMembers } = useGroupMembers(selectedGroup?.members ?? EMPTY_MEMBER_IDS);
  const [memberIds, setMemberIds] = useState<string[]>(() => (user ? [user.id] : []));
  const [destination, setDestination] = useState<TripLocation | null>(null);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (!user) return;
    setMemberIds((current) => (current.length > 0 ? current : [user.id]));
  }, [user]);

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    setMemberIds(user ? [user.id] : []);
  };

  const canSave = useMemo(
    () =>
      Boolean(groupId) &&
      memberIds.length > 0 &&
      Boolean(destination?.label && isValidDestination(destination.label)) &&
      isValidTripDateRange(startDate, endDate),
    [groupId, memberIds.length, destination, startDate, endDate]
  );

  const destinationError =
    showValidation && (!destination?.label || !isValidDestination(destination.label))
      ? 'Enter a destination (search or type your own)'
      : undefined;

  const handleSave = async () => {
    setShowValidation(true);
    if (!user || !destination?.label || !canSave) return;
    setLoading(true);
    setError(null);
    try {
      const tripId = await createTrip(user.id, {
        groupId,
        destination: destination.label,
        destinationDetail: destination.detail,
        placeId: destination.placeId,
        destinationSource: destination.source,
        startDate,
        endDate,
        memberIds,
      });
      router.replace(`/(app)/trip/${tripId}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ItemFormScreen
      title="Create a Trip"
      rightAction={
        <HeaderSaveButton label="Create" onPress={handleSave} loading={loading} />
      }
    >
      {groups.length > 0 ? (
        <GroupPicker groups={groups} groupId={groupId} onChange={handleGroupChange} />
      ) : null}

      <DestinationSearchField
        value={destination}
        onChange={(next) => {
          setDestination(next);
          if (next?.label && isValidDestination(next.label)) setShowValidation(false);
        }}
        error={destinationError}
      />

      <DateRangePickerField
        label="Travel dates"
        sheetTitle="Travel dates"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        getRangeError={getTripDateRangeError}
        formatDayCountLabel={formatTripDayCountLabel}
      />

      <MemberSearchAddField
        members={groupMembers}
        selectedIds={memberIds}
        onChange={setMemberIds}
        label="Trip members"
        placeholder="Search group members to add"
        emptyMessage="Add members to your group to share this trip."
        lockedIds={user ? [user.id] : []}
        helperText="Group owners and admins can always see every trip."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ItemFormScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
