import React from 'react';
import { useAuth } from '../../../src/context/AuthContext';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../../src/context/AppContext';
import { GroupSelector } from '../../../src/components/GroupSelector';
import { EmptyState } from '../../../src/components/EmptyState';
import { NoGroupsPrompt } from '../../../src/components/NoGroupsPrompt';
import { Fab } from '../../../src/components/Fab';
import { MainTabScreen } from '../../../src/components/MainTabScreen';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { TripCard } from '../../../src/components/TripCard';
import {
  TRIPS_EMPTY_ICON_WRAP_SIZE,
  TRIPS_ICON_SIZE,
  TripsIcon,
} from '../../../src/components/TripsIcon';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';

export default function TripsScreen() {
  const { groups, activeGroup, selectGroup, loading, getGroupTrips } = useApp();
  const { user } = useAuth();
  const trips = activeGroup ? getGroupTrips(activeGroup.id) : [];

  const handleGroupChange = async (groupId: string) => {
    await selectGroup(groupId);
  };

  const handleCreateTrip = () => {
    router.push('/(app)/trip/create');
  };

  const handleOpenTrip = (tripId: string) => {
    router.push(`/(app)/trip/${tripId}` as Href);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (groups.length === 0) {
    return (
      <MainTabScreen title="Trips">
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <NoGroupsPrompt />
        </SafeAreaView>
      </MainTabScreen>
    );
  }

  return (
    <MainTabScreen title="Trips">
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GroupSelector
            groups={groups}
            activeGroup={activeGroup}
            onSelect={handleGroupChange}
          />

          {activeGroup ? (
            <>
              <Text style={styles.sectionHeading}>Group trips</Text>
              {loading && trips.length === 0 ? (
                <LoadingScreen />
              ) : trips.length === 0 ? (
                <EmptyState
                  iconNode={
                    <TripsIcon size={TRIPS_ICON_SIZE.emptyLarge} color={colors.primaryDark} />
                  }
                  title="No trips yet"
                  subtitle="Plan a shared itinerary with dates, places, and day-by-day details for your group."
                  compact
                  iconWrapSize={TRIPS_EMPTY_ICON_WRAP_SIZE}
                />
              ) : (
                <View style={styles.tripList}>
                  {trips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onPress={() => handleOpenTrip(trip.id)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <EmptyState
              iconNode={
                <TripsIcon size={TRIPS_ICON_SIZE.emptyLarge} color={colors.primaryDark} />
              }
              title="Select a group"
              subtitle="Choose a group to view and plan trips together."
              compact
              iconWrapSize={TRIPS_EMPTY_ICON_WRAP_SIZE}
            />
          )}
        </ScrollView>

        {activeGroup ? (
          <Fab onPress={handleCreateTrip} accessibilityLabel="Create a trip" />
        ) : null}
      </SafeAreaView>
    </MainTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl + 56,
  },
  sectionHeading: {
    ...typography.sectionTitle,
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  tripList: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
  },
});
