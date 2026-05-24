import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { dismissFormScreen } from '../utils/navigation';
import { colors } from '../constants/theme';

interface HeaderCancelButtonProps {
  label?: string;
  onPress?: () => void;
}

export function HeaderCancelButton({
  label = 'Cancel',
  onPress,
}: HeaderCancelButtonProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          onPress();
          return;
        }
        dismissFormScreen();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.button}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '400',
  },
});
