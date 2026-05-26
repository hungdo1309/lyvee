export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

const MIN_LENGTH = 8;
const STRONG_LENGTH = 10;

const HAS_LETTER = /[A-Za-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

const PASSWORD_REQUIREMENT_DEFS = [
  {
    id: 'length',
    label: 'At least 8 characters',
    error: 'Password must be at least 8 characters',
    test: (password: string) => password.length >= MIN_LENGTH,
  },
  {
    id: 'letter',
    label: 'At least one letter',
    error: 'Add at least one letter',
    test: (password: string) => HAS_LETTER.test(password),
  },
  {
    id: 'number',
    label: 'At least one number',
    error: 'Add at least one number',
    test: (password: string) => HAS_NUMBER.test(password),
  },
  {
    id: 'special',
    label: 'At least one special character',
    error: 'Add at least one special character',
    test: (password: string) => HAS_SPECIAL.test(password),
  },
] as const;

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return PASSWORD_REQUIREMENT_DEFS.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export function getPasswordMatchRequirement(
  password: string,
  confirmPassword: string
): PasswordRequirement {
  return {
    id: 'match',
    label: 'Passwords match',
    met: confirmPassword.length > 0 && confirmPassword === password,
  };
}

export function getPasswordDifferentFromCurrentRequirement(
  newPassword: string,
  currentPassword: string
): PasswordRequirement {
  return {
    id: 'different',
    label: 'Different from current password',
    met:
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      newPassword !== currentPassword,
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const requirements = getPasswordRequirements(password);
  const errors = PASSWORD_REQUIREMENT_DEFS.filter((rule) => !rule.test(password)).map(
    (rule) => rule.error
  );

  return {
    isValid: requirements.every((requirement) => requirement.met),
    errors,
  };
}

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  const hasLetter = HAS_LETTER.test(password);
  const hasNumber = HAS_NUMBER.test(password);

  if (password.length < MIN_LENGTH || !hasLetter || !hasNumber) {
    return 'weak';
  }

  if (password.length >= STRONG_LENGTH && hasLetter && hasNumber) {
    return 'strong';
  }

  return 'medium';
}
