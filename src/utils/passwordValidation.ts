export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

const MIN_LENGTH = 8;
const STRONG_LENGTH = 10;

const HAS_LETTER = /[A-Za-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push('Password must be at least 8 characters');
  }
  if (!HAS_LETTER.test(password)) {
    errors.push('Add at least one letter');
  }
  if (!HAS_NUMBER.test(password)) {
    errors.push('Add at least one number');
  }
  if (!HAS_SPECIAL.test(password)) {
    errors.push('Add at least one special character');
  }

  return {
    isValid: errors.length === 0,
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
