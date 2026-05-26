import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors } from '../constants/theme';
import { formatButtonLabel } from '../utils/strings';

interface ScreenBackButtonProps {
  label?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ScreenBackButton({
  label = 'Back',
  onPress,
  showChevron = false,
}: ScreenBackButtonProps) {
  const formattedLabel = formatButtonLabel(label);

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.button, showChevron && styles.buttonWithChevron]}
      accessibilityRole="button"
      accessibilityLabel={formattedLabel}
    >
      {showChevron ? (
        <Ionicons name="chevron-back" size={22} color={colors.primary} style={styles.chevron} />
      ) : null}
      <Text style={styles.label}>{formattedLabel}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  buttonWithChevron: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: -6,
    marginRight: -2,
  },
  label: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '400',
  },
});
