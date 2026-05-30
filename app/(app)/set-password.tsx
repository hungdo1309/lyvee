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
  getPasswordMatchRequirement,
  validatePassword,
} from '../../src/utils/passwordValidation';

export default function SetPasswordScreen() {
  const { user, setPassword } = useAuth();
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showConfirmChecks, setShowConfirmChecks] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === password;

  const confirmPasswordHighlight = passwordsMatch
    ? 'success'
    : confirmPasswordFocused
      ? 'error'
      : undefined;

  const canSubmit =
    passwordValidation.isValid && passwordsMatch;

  const validate = () => {
    const next: typeof errors = {};

    if (!passwordValidation.isValid) {
      next.password = passwordValidation.errors[0];
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Confirm your password';
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user?.email) return;

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Your password cannot be set until Firebase is set up.'
      );
      return;
    }

    setLoading(true);
    try {
      await setPassword(user.email, password);
      appAlert(
        'Password restored',
        'You can now sign in with your email and password as well as Google.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      appAlert(
        'Could not set password',
        error instanceof Error ? error.message : 'Failed to set password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton label="Back to Settings" showChevron />
        <Text style={styles.screenTitle}>Set password</Text>
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
            Restore email and password sign-in for {user?.email}. Your Lyvee
            data stays on this account — this only adds password login back
            alongside Google.
          </Text>

          <View style={styles.passwordField}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPasswordValue}
              placeholder="Create your password"
              secureTextEntry
              autoComplete="new-password"
              onFocus={() => setShowPasswordRequirements(true)}
              error={errors.password}
            />
            <PasswordRequirementsChecklist
              password={password}
              visible={showPasswordRequirements}
            />
            {password.length > 0 ? (
              <PasswordStrengthIndicator password={password} />
            ) : null}
          </View>
          <View style={styles.confirmField}>
            <Input
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
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
              items={[getPasswordMatchRequirement(password, confirmPassword)]}
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
    lineHeight: 20,
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
