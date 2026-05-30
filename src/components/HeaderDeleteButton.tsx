import React from 'react';
import { Button } from './Button';

interface HeaderDeleteButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function HeaderDeleteButton({
  onPress,
  loading = false,
  disabled = false,
  label = 'Delete',
}: HeaderDeleteButtonProps) {
  return (
    <Button
      title={label}
      variant="cancel"
      size="sm"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
    />
  );
}
