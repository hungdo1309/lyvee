import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Trip } from '../types/trips';
import { countTripDays, countTripEntries, formatTripDateRange } from '../utils/trips';
import { Card } from './Card';
import { TripsIcon } from './TripsIcon';
import { colors, radius, spacing, typography } from '../constants/theme';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const dayCount = countTripDays(trip.startDate, trip.endDate);
  const entryCount = countTripEntries(trip);

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <TripsIcon size={20} color={colors.primaryDark} />
      </View>
      <View style={styles.content}>
        <Text style={styles.destination} numberOfLines={2}>
          {trip.destination}
        </Text>
        <Text style={styles.dates}>{formatTripDateRange(trip.startDate, trip.endDate)}</Text>
        <Text style={styles.meta}>
          {dayCount} {dayCount === 1 ? 'day' : 'days'}
          {entryCount > 0 ? ` · ${entryCount} plan ${entryCount === 1 ? 'item' : 'items'}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  destination: {
    ...typography.heading,
    fontSize: 17,
  },
  dates: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
});
