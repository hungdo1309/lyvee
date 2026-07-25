import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { appAlert } from '../../../src/utils/dialog';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { ItemFormScreen } from '../../../src/components/ItemFormScreen';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import { HeaderDeleteButton } from '../../../src/components/HeaderDeleteButton';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { EmptyState } from '../../../src/components/EmptyState';
import { TripDaySection } from '../../../src/components/TripDaySection';
import { TripEntryEditor } from '../../../src/components/TripEntryEditor';
import { TripFlightsEditor } from '../../../src/components/TripFlightsEditor';
import { TripStaysEditor } from '../../../src/components/TripStaysEditor';
import { TripMembersEditor } from '../../../src/components/TripMembersEditor';
import { TripDatesEditor } from '../../../src/components/TripDatesEditor';
import { TRIPS_ICON_SIZE, TripsIcon } from '../../../src/components/TripsIcon';
import { createTripExpenseGroup } from '../../../src/services/expenseGroups';
import {
  addTripFlight,
  addTripStay,
  deleteTrip,
  deleteTripEntry,
  deleteTripFlight,
  deleteTripStayBlock,
  reorderTripDayEntries,
  subscribeToTrip,
  updateTripDates,
  updateTripFlight,
  updateTripMembers,
  updateTripStay,
  upsertTripEntry,
} from '../../../src/services/trips';
import { useGroupMembers, EMPTY_MEMBER_IDS } from '../../../src/hooks/useGroupMembers';
import { Trip, TripDayPlan, TripItineraryEntry } from '../../../src/types/trips';
import { TripFlightInput } from '../../../src/utils/tripFlights';
import { TripStayInput } from '../../../src/utils/tripStays';
import { TripStayBlockRecord } from '../../../src/utils/tripStayEntries';
import {
  countTripDays,
  formatTripDateRange,
} from '../../../src/utils/trips';
import { isAutoStayEntryId } from '../../../src/utils/tripStayEntries';
import { isAutoFlightEntryId } from '../../../src/utils/tripFlightEntries';
import { canDeleteTrip, canEditTrip, canViewTrip } from '../../../src/utils/tripPermissions';
import {
  canCreateTripExpenseGroup,
  canViewTripExpenses,
} from '../../../src/utils/expensePermissions';
import { colors, spacing, typography } from '../../../src/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TripDetailScreen() {
  const { id, date, entryId } = useLocalSearchParams<{
    id: string;
    date?: string;
    entryId?: string;
  }>();
  const { user } = useAuth();
  const { groups, getTripExpenseGroup } = useApp();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryEditorVisible, setEntryEditorVisible] = useState(false);
  const [flightEditorVisible, setFlightEditorVisible] = useState(false);
  const [stayEditorVisible, setStayEditorVisible] = useState(false);
  const [membersEditorVisible, setMembersEditorVisible] = useState(false);
  const [datesEditorVisible, setDatesEditorVisible] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TripItineraryEntry | null>(null);
  const [expandedDayKeys, setExpandedDayKeys] = useState<Record<string, true>>({});
  const [expenseLoading, setExpenseLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsubscribe = subscribeToTrip(id, (nextTrip) => {
      setTrip(nextTrip);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!date || !trip) return;
    if (!trip.days.some((day) => day.date === date)) return;
    setExpandedDayKeys((current) => ({ ...current, [date]: true }));
  }, [date, entryId, trip?.id]);

  const toggleDayExpanded = (dateKey: string, expanded: boolean) => {
    setExpandedDayKeys((current) => {
      if (expanded) {
        return { ...current, [dateKey]: true };
      }
      if (!current[dateKey]) return current;
      const next = { ...current };
      delete next[dateKey];
      return next;
    });
  };

  const activeDay = useMemo(
    () => trip?.days.find((day) => day.date === activeDateKey) ?? null,
    [trip, activeDateKey]
  );

  const tripDestinationAnchor = useMemo(() => {
    if (!trip) return null;
    return trip.destinationDetail
      ? `${trip.destination}, ${trip.destinationDetail}`
      : trip.destination;
  }, [trip]);

  const entrySearchNear = useMemo(
    () => activeDay?.city ?? tripDestinationAnchor,
    [activeDay?.city, tripDestinationAnchor]
  );

  const tripGroup = useMemo(
    () => groups.find((group) => group.id === trip?.groupId) ?? null,
    [groups, trip?.groupId]
  );
  const { members: groupMembers } = useGroupMembers(tripGroup?.members ?? EMPTY_MEMBER_IDS);

  const canView = Boolean(user && trip && tripGroup && canViewTrip(trip, tripGroup, user.id));
  const canEdit = Boolean(user && trip && tripGroup && canEditTrip(trip, tripGroup, user.id));
  const canDeleteTripPermission = Boolean(
    trip && user && tripGroup && canDeleteTrip(trip, tripGroup, user.id)
  );

  const tripExpenseGroup = trip ? getTripExpenseGroup(trip.id) : null;
  const linkedExpenseGroupId = tripExpenseGroup?.id ?? trip?.expenseGroupId ?? null;
  const hasTripExpenseGroup = Boolean(linkedExpenseGroupId);
  const canCreateTripExpenses = Boolean(
    user && trip && tripGroup && canCreateTripExpenseGroup(trip, tripGroup, user.id)
  );
  const canViewTripExpensesPermission = Boolean(
    user && trip && tripGroup && canViewTripExpenses(trip, tripGroup, user.id)
  );
  const showCreateTripExpenseButton = canCreateTripExpenses && !hasTripExpenseGroup;
  const showViewTripExpensesButton = hasTripExpenseGroup && canViewTripExpensesPermission;

  const handleOpenTripExpenses = () => {
    if (!linkedExpenseGroupId) return;
    router.push(`/(app)/expense/${linkedExpenseGroupId}?from=trip` as Href);
  };

  const handleCreateTripExpenseGroup = async () => {
    if (!trip || !user) return;

    setExpenseLoading(true);
    try {
      const expenseGroupId = await createTripExpenseGroup(user.id, trip);
      router.push(`/(app)/expense/${expenseGroupId}?from=trip` as Href);
    } catch (error) {
      console.warn('[trip] createTripExpenseGroup failed:', error);
      appAlert(
        'Error',
        error instanceof Error ? error.message : 'Could not create trip expenses'
      );
    } finally {
      setExpenseLoading(false);
    }
  };

  const openCreateEntry = (dateKey: string) => {
    setActiveDateKey(dateKey);
    setEditingEntry(null);
    setEntryEditorVisible(true);
  };

  const openEditEntry = (dateKey: string, entry: TripItineraryEntry) => {
    setActiveDateKey(dateKey);
    setEditingEntry(entry);
    setEntryEditorVisible(true);
  };

  const handleSaveEntry = async (entry: TripItineraryEntry, entryDateKey: string) => {
    if (!trip) return;
    await upsertTripEntry(trip, entryDateKey, entry);
  };

  const handleSaveFlight = async (input: TripFlightInput, flightKey?: string) => {
    if (!trip) return;
    if (flightKey) {
      await updateTripFlight(trip, flightKey, input);
    } else {
      await addTripFlight(trip, input);
    }
  };

  const handleDeleteFlight = async (flightKey: string) => {
    if (!trip) return;
    await deleteTripFlight(trip, flightKey);
  };

  const handleSaveStay = async (
    input: TripStayInput,
    previousBlock?: TripStayBlockRecord | null
  ) => {
    if (!trip) {
      throw new Error('Trip not found');
    }
    if (previousBlock) {
      await updateTripStay(trip, previousBlock, input);
    } else {
      await addTripStay(trip, input);
    }
  };

  const handleDeleteStayBlock = async (block: TripStayBlockRecord) => {
    if (!trip) return;
    await deleteTripStayBlock(trip, block);
  };

  const handleSaveTripDates = async (startDate: string, endDate: string) => {
    if (!trip || !user) return;
    await updateTripDates(trip, startDate, endDate, user.id);
  };

  const handleSaveTripMembers = async (memberIds: string[]) => {
    if (!trip || !user) return;
    await updateTripMembers(trip, memberIds, user.id);
  };

  const tripMemberLabel = useMemo(() => {
    if (!trip) return '';
    if (trip.memberIds.length === 0) return 'All group members';
    const count = trip.memberIds.length;
    return `${count} ${count === 1 ? 'member' : 'members'}`;
  }, [trip]);

  const handleReorderEntries = async (dateKey: string, entries: TripItineraryEntry[]) => {
    if (!trip) return;
    await reorderTripDayEntries(
      trip,
      dateKey,
      entries.map((entry) => entry.id)
    );
  };

  const handleDeleteEntry = (dateKey: string, entry: TripItineraryEntry) => {
    if (!trip) return;
    const isStayItem = isAutoStayEntryId(entry.id);
    const isFlightItem = isAutoFlightEntryId(entry.id);
    appAlert(
      isStayItem ? 'Remove City & Stay?' : isFlightItem ? 'Remove flight?' : 'Remove plan item?',
      isStayItem
        ? 'This will remove the stay, city details, and check-in / check-out items for those days. Other plan items stay on your trip.'
        : isFlightItem
          ? 'This will remove both the departure and arrival items for this flight.'
          : `"${entry.title}" will be removed from this day.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void deleteTripEntry(trip, dateKey, entry.id),
        },
      ]
    );
  };

  const handleDeleteTrip = () => {
    if (!trip) return;
    appAlert(
      'Delete this trip?',
      `"${trip.destination}" and its itinerary will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete trip',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            await deleteTrip(trip.id, user.id);
            router.back();
          },
        },
      ]
    );
  };

  const headerBackButton = (
    <ScreenBackButton label="Back to Trips" showChevron style={styles.headerBackButton} />
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (!trip) {
    return (
      <ItemFormScreen title="Trip" leftAction={headerBackButton}>
        <EmptyState
          iconNode={<TripsIcon size={TRIPS_ICON_SIZE.emptyLarge} color={colors.primaryDark} />}
          title="Trip not found"
          subtitle="This trip may have been deleted."
          compact
          iconWrapSize={80}
        />
      </ItemFormScreen>
    );
  }

  const dayCount = countTripDays(trip.startDate, trip.endDate);

  return (
    <>
      <ItemFormScreen
        title=""
        nestableScroll
        leftAction={headerBackButton}
        rightAction={
          canDeleteTripPermission ? (
            <HeaderDeleteButton onPress={handleDeleteTrip} />
          ) : undefined
        }
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.destination}>{trip.destination}</Text>
            {trip.destinationDetail ? (
              <Text style={styles.destinationDetail}>{trip.destinationDetail}</Text>
            ) : null}
            {canEdit ? (
              <TouchableOpacity
                style={styles.dateRangeButton}
                onPress={() => setDatesEditorVisible(true)}
                accessibilityLabel="Edit trip dates"
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.dateRange}>
                  {formatTripDateRange(trip.startDate, trip.endDate)}
                  <Text style={styles.dateRangeMeta}>
                    {` · ${dayCount} ${dayCount === 1 ? 'day' : 'days'}`}
                  </Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.dateRange}>
                {formatTripDateRange(trip.startDate, trip.endDate)}
                <Text style={styles.dateRangeMeta}>
                  {` · ${dayCount} ${dayCount === 1 ? 'day' : 'days'}`}
                </Text>
              </Text>
            )}
            <TouchableOpacity
              style={styles.membersButton}
              onPress={() => setMembersEditorVisible(true)}
              accessibilityLabel="Trip members"
            >
              <Ionicons name="people-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.membersButtonText}>{tripMemberLabel}</Text>
            </TouchableOpacity>
            {showViewTripExpensesButton ? (
              <TouchableOpacity
                style={styles.membersButton}
                onPress={handleOpenTripExpenses}
                accessibilityLabel="View trip expenses"
              >
                <Ionicons name="cash" size={16} color={colors.money} />
                <Text style={styles.membersButtonText}>View Expenses</Text>
              </TouchableOpacity>
            ) : null}
            {showCreateTripExpenseButton ? (
              <TouchableOpacity
                style={styles.membersButton}
                onPress={() => void handleCreateTripExpenseGroup()}
                disabled={expenseLoading}
                accessibilityLabel="Create trip expenses"
              >
                <Ionicons name="cash" size={16} color={colors.money} />
                <Text style={styles.membersButtonText}>
                  {expenseLoading ? 'Creating…' : '+ Trip Expenses'}
                </Text>
              </TouchableOpacity>
            ) : null}
            {canEdit ? (
              <View style={styles.tripActionsRow}>
                <TouchableOpacity
                  style={styles.tripActionButton}
                  onPress={() => setFlightEditorVisible(true)}
                  accessibilityLabel="Flight"
                >
                  <Ionicons name="airplane-outline" size={16} color={colors.primaryDark} />
                  <Text style={styles.tripActionButtonText}>Flight</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tripActionButton}
                  onPress={() => setStayEditorVisible(true)}
                  accessibilityLabel="City & Stay"
                >
                  <MaterialIcons name="hotel" size={16} color={colors.primaryDark} />
                  <Text style={styles.tripActionButtonText}>City & Stay</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.planSection}>
            <Text style={styles.sectionHeading}>Day-by-day plan</Text>

            <View style={styles.dayList}>
              {trip.days.map((day: TripDayPlan, index) => (
                <TripDaySection
                  key={day.date}
                  day={day}
                  dayNumber={index + 1}
                  canEdit={canEdit}
                  expanded={Boolean(expandedDayKeys[day.date])}
                  onExpandedChange={(expanded) => toggleDayExpanded(day.date, expanded)}
                  onAddEntry={() => openCreateEntry(day.date)}
                  onEditEntry={(entry) => openEditEntry(day.date, entry)}
                  onDeleteEntry={(entry) => handleDeleteEntry(day.date, entry)}
                  onReorderEntries={(entries) => handleReorderEntries(day.date, entries)}
                />
              ))}
            </View>
          </View>
        </View>
      </ItemFormScreen>

      <TripEntryEditor
        visible={entryEditorVisible}
        initialEntry={editingEntry}
        entryDateKey={activeDateKey}
        tripStartDate={trip?.startDate}
        tripEndDate={trip?.endDate}
        searchNear={entrySearchNear}
        onClose={() => setEntryEditorVisible(false)}
        onSave={handleSaveEntry}
      />

      <TripFlightsEditor
        visible={flightEditorVisible}
        trip={trip}
        searchNear={tripDestinationAnchor}
        onClose={() => setFlightEditorVisible(false)}
        onSaveFlight={handleSaveFlight}
        onDeleteFlight={handleDeleteFlight}
      />

      <TripStaysEditor
        visible={stayEditorVisible}
        trip={trip}
        tripDestination={tripDestinationAnchor}
        onClose={() => setStayEditorVisible(false)}
        onSaveStay={handleSaveStay}
        onDeleteStayBlock={handleDeleteStayBlock}
      />

      <TripDatesEditor
        visible={datesEditorVisible}
        trip={trip}
        onClose={() => setDatesEditorVisible(false)}
        onSave={handleSaveTripDates}
      />

      <TripMembersEditor
        visible={membersEditorVisible}
        trip={trip}
        groupMembers={groupMembers}
        readOnly={!canEdit}
        onClose={() => setMembersEditorVisible(false)}
        onSave={handleSaveTripMembers}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBackButton: {
    marginBottom: 0,
  },
  content: {
    gap: spacing.sm,
  },
  hero: {
    gap: 2,
  },
  destination: {
    ...typography.heading,
    fontSize: 28,
    color: colors.primaryDark,
  },
  destinationDetail: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  dateRange: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dateRangeMeta: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  membersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  membersButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  tripActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  tripActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tripActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  planSection: {
    gap: spacing.xs,
  },
  sectionHeading: {
    ...typography.sectionTitle,
  },
  dayList: {
    gap: spacing.sm,
  },
});
