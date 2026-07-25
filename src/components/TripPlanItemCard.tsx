import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from './Card';
import { TripsIcon } from './TripsIcon';
import { colors, radius, spacing, typography } from '../constants/theme';
import { TripPlanInstance } from '../utils/tripInstances';
import {
  formatTripEntryLocation,
  formatTripEntryTagLabel,
  formatTripEntryTimeLabel,
  getTripEntryTagIcon,
  getTripEntryTagStyle,
} from '../utils/trips';

interface TripPlanItemCardProps {
  instance: TripPlanInstance;
  onPress: () => void;
  groupName?: string;
}

export function TripPlanItemCard({ instance, onPress, groupName }: TripPlanItemCardProps) {
  const { entry, tripDestination } = instance;
  const tagStyle = getTripEntryTagStyle(entry.tag);
  const timeLabel = formatTripEntryTimeLabel(entry);
  const locationLabel = formatTripEntryLocation(entry);

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <TripsIcon size={18} color={colors.primaryDark} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>
        <Text style={styles.tripLabel} numberOfLines={1}>
          {tripDestination}
          {groupName ? ` · ${groupName}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.tagPill, { backgroundColor: tagStyle.backgroundColor, borderColor: tagStyle.color }]}>
            <Ionicons
              name={getTripEntryTagIcon(entry.tag) as keyof typeof Ionicons.glyphMap}
              size={12}
              color={tagStyle.color}
            />
            <Text style={[styles.tagPillText, { color: tagStyle.color }]}>
              {formatTripEntryTagLabel(entry.tag)}
            </Text>
          </View>
          {timeLabel ? <Text style={styles.timeLabel}>{timeLabel}</Text> : null}
        </View>
        {locationLabel ? (
          <Text style={styles.locationLabel} numberOfLines={1}>
            {locationLabel}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
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
  title: {
    ...typography.heading,
    fontSize: 16,
  },
  tripLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
