import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../constants/theme';

interface ScreenBackButtonProps {
  label?: string;
  onPress?: () => void;
}

export function ScreenBackButton({ label = 'Back', onPress }: ScreenBackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.button}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '400',
  },
});
