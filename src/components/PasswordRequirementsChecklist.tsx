import React from 'react';
import { getPasswordRequirements } from '../utils/passwordValidation';
import { PasswordChecklist, type PasswordChecklistItem } from './PasswordChecklist';

interface PasswordRequirementsChecklistProps {
  password: string;
  visible: boolean;
  extraItems?: PasswordChecklistItem[];
}

export function PasswordRequirementsChecklist({
  password,
  visible,
  extraItems = [],
}: PasswordRequirementsChecklistProps) {
  const items = [...getPasswordRequirements(password), ...extraItems];

  return <PasswordChecklist items={items} visible={visible} />;
}
