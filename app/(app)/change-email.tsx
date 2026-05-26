import React, { useState } from 'react';
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
import { colors, layout, spacing, typography } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';

export default function ChangeEmailScreen() {
  const { user, changeEmail } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    newEmail?: string;
    confirmEmail?: string;
    currentPassword?: string;
  }>({});

  const validate = () => {
    const next: typeof errors = {};
    const trimmed = newEmail.trim();

    if (!trimmed) {
      next.newEmail = 'Email is required';
    } else if (trimmed.toLowerCase() === user?.email.toLowerCase()) {
      next.newEmail = 'Enter a different email address';
    }

    if (!confirmEmail.trim()) {
      next.confirmEmail = 'Confirm your new email';
    } else if (trimmed !== confirmEmail.trim()) {
      next.confirmEmail = 'Email addresses do not match';
    }

    if (!currentPassword) {
      next.currentPassword = 'Current password is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Your email cannot be updated until Firebase is set up.'
      );
      return;
    }

    setLoading(true);
    try {
      await changeEmail(newEmail.trim(), currentPassword);
      appAlert('Email updated', 'Your sign-in email has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: unknown) {
      appAlert(
        'Could not update email',
        error instanceof Error ? error.message : 'Failed to update email'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton label="Back to Settings" showChevron />
        <Text style={styles.screenTitle}>Change email</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>Current email: {user?.email}</Text>

          <Input
            label="New email"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.newEmail}
          />
          <Input
            label="Confirm new email"
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.confirmEmail}
          />
          <Input
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter your current password"
            secureTextEntry
            autoComplete="password"
            error={errors.currentPassword}
          />

          <Text style={styles.hint}>
            For security, we require your current password before changing your
            email.
          </Text>

          <Button
            title="Save Email"
            onPress={handleSave}
            loading={loading}
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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.sm,
  },
});
