import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Button } from './Button';

interface CancelButtonProps {
  label?: string;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CancelButton({
  label = 'Cancel',
  onPress,
  size = 'md',
  disabled,
  style,
}: CancelButtonProps) {
  return (
    <Button
      title={label}
      variant="cancel"
      size={size}
      onPress={onPress}
      disabled={disabled}
      style={style}
      accessibilityLabel={label}
    />
  );
}
