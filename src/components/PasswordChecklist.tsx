import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing } from '../constants/theme';

export interface PasswordChecklistItem {
  id: string;
  label: string;
  met: boolean;
}

interface PasswordChecklistProps {
  items: PasswordChecklistItem[];
  visible: boolean;
}

export function PasswordChecklist({ items, visible }: PasswordChecklistProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Ionicons
            name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={item.met ? colors.success : colors.textMuted}
            style={styles.icon}
          />
          <Text style={[styles.label, item.met && styles.labelMet]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  labelMet: {
    color: colors.success,
    fontWeight: '600',
  },
});
