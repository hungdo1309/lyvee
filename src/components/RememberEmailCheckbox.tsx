import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { brand, colors, spacing } from '../constants/theme';

const uncheckedPrimary = `${brand.purple}73`;

interface RememberEmailCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function RememberEmailCheckbox({
  checked,
  onChange,
}: RememberEmailCheckboxProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="Remember my Email"
    >
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={checked ? colors.primary : uncheckedPrimary}
        style={styles.icon}
      />
      <Text style={[styles.label, checked && styles.labelChecked]}>
        Remember my Email
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  icon: {
    marginRight: spacing.sm / 2,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: uncheckedPrimary,
    fontWeight: '600',
  },
  labelChecked: {
    color: colors.primary,
  },
});
