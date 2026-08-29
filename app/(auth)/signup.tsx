import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { appAlert } from '../../src/utils/dialog';
import { Link, router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GoogleAccountLinkError,
  GoogleSignInCancelledError,
  AppleAccountLinkError,
  AppleSignInCancelledError,
  useAuth,
} from '../../src/context/AuthContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { AppLogoHeader } from '../../src/components/AppLogoHeader';
import { AuthDivider } from '../../src/components/AuthDivider';
import { GoogleSignInButton } from '../../src/components/GoogleSignInButton';
import { AppleSignInButton } from '../../src/components/AppleSignInButton';
import { LegalAcceptanceCheckbox } from '../../src/components/LegalAcceptanceCheckbox';
import { PasswordStrengthIndicator } from '../../src/components/PasswordStrengthIndicator';
import { PasswordRequirementsChecklist } from '../../src/components/PasswordRequirementsChecklist';
import { PasswordChecklist } from '../../src/components/PasswordChecklist';
import { colors, spacing, typography } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';
import { isGoogleSignInAvailable, isGoogleSignInConfigured } from '../../src/config/googleSignIn';
import { isAppleSignInAvailable } from '../../src/utils/appleSignIn';
import {
  getPasswordMatchRequirement,
  validatePassword,
} from '../../src/utils/passwordValidation';

export default function SignUpScreen() {
  const { user, register, signUpWithGoogle, completeAppleAuth } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showConfirmChecks, setShowConfirmChecks] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    legal?: string;
  }>({});

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    isAppleSignInAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  // Navigate after auth state updates — avoids racing router.replace before setUser re-renders.
  useEffect(() => {
    if (!user) return;
    router.replace('/(app)' as Href);
  }, [user]);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === password;

  const confirmPasswordHighlight = passwordsMatch
    ? 'success'
    : confirmPasswordFocused
      ? 'error'
      : undefined;

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordValidation.isValid &&
    passwordsMatch &&
    acceptedLegal;

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!email.trim()) next.email = 'Email is required';
    if (!passwordValidation.isValid) {
      next.password = passwordValidation.errors[0];
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Confirm your password';
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match';
    }
    if (!acceptedLegal) {
      next.legal = 'Please agree to the Terms of Use and Privacy Policy';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create account';
      appAlert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!acceptedLegal) {
      setErrors((current) => ({
        ...current,
        legal: 'Please agree to the Terms of Use and Privacy Policy',
      }));
      return;
    }

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return;
    }

    if (!isGoogleSignInAvailable()) {
      appAlert(
        'Google Sign-Up not available',
        'Install a LyVee preview or production build to sign up with Google. Expo Go is not supported.'
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await signUpWithGoogle();
    } catch (error: unknown) {
      if (error instanceof GoogleSignInCancelledError) {
        return;
      }
      if (error instanceof GoogleAccountLinkError) {
        appAlert('Account already exists', error.message);
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Failed to sign up with Google';
      appAlert('Google sign up failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const beforeAppleSignUp = () => {
    if (!acceptedLegal) {
      setErrors((current) => ({
        ...current,
        legal: 'Please agree to the Terms of Use and Privacy Policy',
      }));
      return false;
    }

    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return false;
    }

    return true;
  };

  const handleAppleSignUpError = (error: unknown) => {
    if (error instanceof AppleSignInCancelledError) {
      return;
    }
    if (error instanceof AppleAccountLinkError) {
      appAlert('Account already exists', error.message);
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to sign up with Apple';
    appAlert(message, 'If this keeps happening, Apple sign-in may need to be configured in Firebase, or you may already have a LyVee account — try Sign In instead.');
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
            <AppLogoHeader tagline="Start organizing life together" />
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
          </View>

          <LegalAcceptanceCheckbox
            checked={acceptedLegal}
            onChange={(checked) => {
              setAcceptedLegal(checked);
              if (checked) {
                setErrors((current) => ({ ...current, legal: undefined }));
              }
            }}
            error={errors.legal}
          />

          <View style={styles.authActions}>
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              disabled={!canSubmit}
              size="lg"
            />
            {appleAvailable || isGoogleSignInConfigured() ? (
              <>
                <AuthDivider />
                {appleAvailable ? (
                  <AppleSignInButton
                    type="signUp"
                    beforeStart={beforeAppleSignUp}
                    onAppleCredential={async (payload) => {
                      await completeAppleAuth(payload, 'signUp');
                    }}
                    onAppleError={handleAppleSignUpError}
                    disabled={loading || googleLoading}
                  />
                ) : null}
                {isGoogleSignInConfigured() ? (
                  <GoogleSignInButton
                    type="signUp"
                    onPress={handleGoogleSignUp}
                    loading={googleLoading}
                    disabled={loading}
                  />
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Sign In
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
  form: {
    marginBottom: 0,
  },
  authActions: {
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  passwordField: {
    marginTop: 0,
  },
  confirmField: {
    marginTop: 0,
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
