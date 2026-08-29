import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { appAlert } from '../../src/utils/dialog';
import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
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
import { RememberEmailCheckbox } from '../../src/components/RememberEmailCheckbox';
import { colors, spacing, typography } from '../../src/constants/theme';
import { isFirebaseConfigured } from '../../src/config/firebase';
import { isGoogleSignInAvailable, isGoogleSignInConfigured } from '../../src/config/googleSignIn';
import { isAppleSignInAvailable } from '../../src/utils/appleSignIn';
import {
  loadRememberedEmail,
  persistRememberEmailPreference,
} from '../../src/services/rememberedEmail';

export default function LoginScreen() {
  const { login, loginWithGoogle, completeAppleAuth, linkGoogleWithPassword } = useAuth();
  const { redirect, code } = useLocalSearchParams<{
    redirect?: string;
    code?: string;
  }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [linkEmail, setLinkEmail] = useState<string | null>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; linkPassword?: string }>({});

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    isAppleSignInAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    loadRememberedEmail()
      .then((savedEmail) => {
        if (!savedEmail) return;
        setEmail(savedEmail);
        setRememberEmail(true);
      })
      .catch(() => {
        // SecureStore may be unavailable in some dev environments.
      });
  }, []);

  const persistRememberEmail = async (address: string) => {
    try {
      await persistRememberEmailPreference(address, rememberEmail);
    } catch {
      // Non-blocking if storage fails.
    }
  };

  const navigateAfterAuth = async (address: string) => {
    await persistRememberEmail(address);
    if (redirect === 'join' && code) {
      router.replace(`/join?code=${code}` as Href);
    } else {
      router.replace('/(app)' as Href);
    }
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
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
      await login(email.trim(), password);
      await navigateAfterAuth(email.trim());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to sign in';
      appAlert('Sign in failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return;
    }

    if (!isGoogleSignInAvailable()) {
      appAlert(
        'Google Sign-In not available',
        'Install a LyVee preview or production build to sign in with Google. Expo Go is not supported.'
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      await navigateAfterAuth(email.trim());
    } catch (error: unknown) {
      if (error instanceof GoogleSignInCancelledError) {
        return;
      }
      if (error instanceof GoogleAccountLinkError) {
        setLinkEmail(error.email);
        setEmail(error.email);
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Failed to sign in with Google';
      appAlert('Google sign in failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const beforeAppleSignIn = () => {
    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return false;
    }
    return true;
  };

  const handleAppleSignInError = (error: unknown) => {
    if (error instanceof AppleSignInCancelledError) {
      return;
    }
    if (error instanceof AppleAccountLinkError) {
      appAlert(
        'Account already exists',
        'Sign in with your email and password, then link your Apple Account from Settings if you want both.'
      );
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to sign in with Apple';
    appAlert('Apple sign in failed', message);
  };

  const handleLinkGoogle = async () => {
    if (!linkEmail || !linkPassword) {
      setErrors((prev) => ({ ...prev, linkPassword: 'Password is required' }));
      return;
    }

    setGoogleLoading(true);
    try {
      await linkGoogleWithPassword(linkEmail, linkPassword);
      setLinkEmail(null);
      setLinkPassword('');
      await navigateAfterAuth(linkEmail);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to link Google account';
      appAlert('Could not link Google', message);
    } finally {
      setGoogleLoading(false);
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
            <AppLogoHeader tagline="Shared life, simplified" />
          </View>

          {linkEmail ? (
            <View style={styles.form}>
              <Text style={styles.linkTitle}>Link your Google account</Text>
              <Text style={styles.linkSubtitle}>
                An account already exists for {linkEmail}. Enter your password to
                link Google to it.
              </Text>
              <Input
                label="Password"
                value={linkPassword}
                onChangeText={setLinkPassword}
                placeholder="Your password"
                secureTextEntry
                autoComplete="password"
                error={errors.linkPassword}
              />
              <Button
                title="Link and Sign In"
                onPress={handleLinkGoogle}
                loading={googleLoading}
                disabled={linkPassword.length === 0}
                size="lg"
                style={styles.button}
              />
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setLinkEmail(null);
                  setLinkPassword('');
                }}
                style={styles.cancelButton}
              />
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.form,
                  !isGoogleSignInConfigured() && styles.formWithFooterSpacing,
                ]}
              >
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
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry
                  autoComplete="password"
                  error={errors.password}
                />
                <View style={styles.loginOptionsRow}>
                  <RememberEmailCheckbox
                    checked={rememberEmail}
                    onChange={setRememberEmail}
                  />
                  <Link
                    href={
                      email.trim()
                        ? (`/(auth)/forgot-password?email=${encodeURIComponent(email.trim())}` as Href)
                        : ('/(auth)/forgot-password' as Href)
                    }
                    style={styles.forgotPasswordLink}
                  >
                    Forgot Password?
                  </Link>
                </View>
                <Button
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={password.length === 0}
                  size="lg"
                  style={styles.signInButton}
                />
              </View>

              {isGoogleSignInConfigured() || appleAvailable ? (
                <View style={styles.authActions}>
                  <AuthDivider />
                  {appleAvailable ? (
                    <AppleSignInButton
                      beforeStart={beforeAppleSignIn}
                      onAppleCredential={async (payload) => {
                        const profile = await completeAppleAuth(payload, 'signIn');
                        await navigateAfterAuth(profile.email);
                      }}
                      onAppleError={handleAppleSignInError}
                      disabled={loading || googleLoading}
                    />
                  ) : null}
                  {isGoogleSignInConfigured() ? (
                    <GoogleSignInButton
                      onPress={handleGoogleSignIn}
                      loading={googleLoading}
                      disabled={loading}
                    />
                  ) : null}
                </View>
              ) : null}
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" style={styles.link}>
              Sign Up
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
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    marginBottom: 0,
  },
  formWithFooterSpacing: {
    marginBottom: spacing.lg,
  },
  loginOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: -spacing.sm,
    minHeight: 24,
  },
  forgotPasswordLink: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: '600',
    flexShrink: 0,
  },
  signInButton: {
    marginTop: spacing.sm,
  },
  authActions: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.sm,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  linkTitle: {
    ...typography.heading,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  linkSubtitle: {
    ...typography.caption,
    marginBottom: spacing.lg,
    lineHeight: 20,
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
