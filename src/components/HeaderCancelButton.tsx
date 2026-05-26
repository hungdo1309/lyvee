import React from 'react';
import { CancelButton } from './CancelButton';
import { dismissFormScreen } from '../utils/navigation';

interface HeaderCancelButtonProps {
  label?: string;
  onPress?: () => void;
}

export function HeaderCancelButton({
  label = 'Cancel',
  onPress,
}: HeaderCancelButtonProps) {
  return (
    <CancelButton
      label={label}
      size="sm"
      onPress={() => {
        if (onPress) {
          onPress();
          return;
        }
        dismissFormScreen();
      }}
    />
  );
}
