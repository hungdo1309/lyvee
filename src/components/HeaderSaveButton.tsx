import React from 'react';
import { Button } from './Button';

interface HeaderSaveButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function HeaderSaveButton({
  onPress,
  loading = false,
  disabled = false,
  label = 'Save',
}: HeaderSaveButtonProps) {
  return (
    <Button
      title={label}
      variant="primary"
      size="sm"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
    />
  );
}
