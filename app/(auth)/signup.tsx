import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { PasswordStrengthIndicator } from '../../src/components/PasswordStrengthIndicator';
import { colors, spacing, typography } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';
import { validatePassword } from '../../src/utils/passwordValidation';

export default function SignUpScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordValidation.isValid;

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!email.trim()) next.email = 'Email is required';
    if (!passwordValidation.isValid) {
      next.password = passwordValidation.errors[0];
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    if (!isFirebaseConfigured()) {
      Alert.alert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace('/(app)' as Href);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create account';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start organizing life together</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoComplete="name"
              error={errors.name}
            />
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
            <View style={styles.passwordField}>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="8+ chars with letter, number & symbol"
                secureTextEntry
                autoComplete="new-password"
              />
              <PasswordStrengthIndicator password={password} />
              {password.length > 0 && passwordValidation.errors.length > 0 && (
                <View style={styles.passwordErrors}>
                  {passwordValidation.errors.map((message) => (
                    <Text key={message} style={styles.passwordError}>
                      {message}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              disabled={!canSubmit}
              size="lg"
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </View>
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
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 32,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.lg,
  },
  passwordField: {
    marginTop: 0,
  },
  passwordErrors: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  passwordError: {
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  button: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
  },
  link: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
