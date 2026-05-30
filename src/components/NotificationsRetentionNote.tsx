import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NOTIFICATION_RETENTION_NOTE } from '../constants/notifications';
import { colors, layout, spacing } from '../constants/theme';

export function NotificationsRetentionNote() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{NOTIFICATION_RETENTION_NOTE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  text: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
