import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { appAlert } from '../../src/utils/dialog';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { ScreenBackButton } from '../../src/components/ScreenBackButton';
import { PasswordStrengthIndicator } from '../../src/components/PasswordStrengthIndicator';
import { PasswordRequirementsChecklist } from '../../src/components/PasswordRequirementsChecklist';
import { PasswordChecklist } from '../../src/components/PasswordChecklist';
import { colors, layout, spacing, typography } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';
import {
  getPasswordDifferentFromCurrentRequirement,
  getPasswordMatchRequirement,
  validatePassword,
} from '../../src/utils/passwordValidation';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showConfirmChecks, setShowConfirmChecks] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const passwordValidation = useMemo(() => validatePassword(newPassword), [newPassword]);
  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === newPassword;
  const isDifferentFromCurrent =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword !== currentPassword;

  const confirmPasswordHighlight = passwordsMatch
    ? 'success'
    : confirmPasswordFocused
      ? 'error'
      : undefined;

  const canSubmit =
    currentPassword.length > 0 &&
    passwordValidation.isValid &&
    isDifferentFromCurrent &&
    passwordsMatch;

  const validate = () => {
    const next: typeof errors = {};

    if (!currentPassword) {
      next.currentPassword = 'Current password is required';
    }

    if (!passwordValidation.isValid) {
      next.newPassword = passwordValidation.errors[0];
    } else if (newPassword === currentPassword) {
      next.newPassword = 'New password must be different from your current password';
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Confirm your new password';
    } else if (newPassword !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Your password cannot be updated until Firebase is set up.'
      );
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      appAlert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: unknown) {
      appAlert(
        'Could not update password',
        error instanceof Error ? error.message : 'Failed to update password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton label="Back to Settings" showChevron />
        <Text style={styles.screenTitle}>Change password</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Choose a strong password you have not used here before.
          </Text>

          <Input
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter your current password"
            secureTextEntry
            autoComplete="password"
            error={errors.currentPassword}
          />
          <View style={styles.passwordField}>
            <Input
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter your new password"
              secureTextEntry
              autoComplete="new-password"
              onFocus={() => setShowPasswordRequirements(true)}
              error={errors.newPassword}
            />
            <PasswordRequirementsChecklist
              password={newPassword}
              visible={showPasswordRequirements}
              extraItems={[
                getPasswordDifferentFromCurrentRequirement(newPassword, currentPassword),
              ]}
            />
            {newPassword.length > 0 ? (
              <PasswordStrengthIndicator password={newPassword} />
            ) : null}
          </View>
          <View style={styles.confirmField}>
            <Input
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your new password"
              secureTextEntry
              autoComplete="new-password"
              onFocus={() => {
                setConfirmPasswordFocused(true);
                setShowConfirmChecks(true);
              }}
              onBlur={() => setConfirmPasswordFocused(false)}
              highlight={confirmPasswordHighlight}
              error={errors.confirmPassword}
            />
            <PasswordChecklist
              visible={showConfirmChecks}
              items={[getPasswordMatchRequirement(newPassword, confirmPassword)]}
            />
          </View>

          <Button
            title="Save Password"
            onPress={handleSave}
            loading={loading}
            disabled={!canSubmit}
            size="lg"
            style={styles.button}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    ...typography.heading,
    fontSize: 24,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  passwordField: {
    marginBottom: 0,
  },
  confirmField: {
    marginTop: 0,
  },
  button: {
    marginTop: spacing.lg,
  },
});
