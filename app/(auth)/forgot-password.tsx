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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { ScreenBackButton } from '../../src/components/ScreenBackButton';
import { colors, layout, spacing, typography } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';
import { requestPasswordReset } from '../../src/services/auth';

export default function ForgotPasswordScreen() {
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) {
      next.email = 'Email is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendResetLink = async () => {
    if (!validate()) return;

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Password reset is unavailable until Firebase is set up.'
      );
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      appAlert(
        'Check your email',
        `If an account exists for ${email.trim()}, we sent a link to reset your password.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      appAlert(
        'Could not send reset link',
        error instanceof Error ? error.message : 'Failed to send reset email'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ScreenBackButton label="Back to Sign In" showChevron />
        <Text style={styles.screenTitle}>Reset password</Text>
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
            Enter the email for your Lyvee account. We will send a link to choose
            a new password.
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Button
            title="Send Reset Link"
            onPress={handleSendResetLink}
            loading={loading}
            disabled={email.trim().length === 0}
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
  button: {
    marginTop: spacing.lg,
  },
});
