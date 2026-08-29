import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { appAlert } from '../../../src/utils/dialog';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppleSignInCancelledError,
  GoogleSignInCancelledError,
  useAuth,
} from '../../../src/context/AuthContext';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { InfoRow, SectionCard } from '../../../src/components/SectionCard';
import { MainTabScreen } from '../../../src/components/MainTabScreen';
import { colors, layout, radius, spacing, typography } from '../../../src/constants/theme';
import { APP_NAME } from '../../../src/constants/app';
import { LEGAL_CONTACT_EMAIL } from '../../../src/constants/legalMeta';
import { getNameInitials } from '../../../src/utils/names';
import { formatMemberSince } from '../../../src/utils/dates';
import { isFirebaseConfigured } from '../../../src/config/firebase';
import { isGoogleSignInAvailable, isGoogleSignInConfigured } from '../../../src/config/googleSignIn';
import { GOOGLE_SIGNIN_UNAVAILABLE_MESSAGE } from '../../../src/utils/googleSignInNative';
import { isAppleSignInAvailable } from '../../../src/utils/appleSignIn';

export default function SettingsScreen() {
  const { user, firebaseUser, linkedProviders, linkGoogle, linkApple, logout } = useAuth();
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const memberSince = formatMemberSince(
    user?.createdAt ?? firebaseUser?.metadata.creationTime ?? ''
  );
  const { hasPassword, hasGoogle, hasApple } = linkedProviders;
  const showGoogleSection = isGoogleSignInConfigured();
  const showGoogleLink = showGoogleSection && !hasGoogle;
  const showAppleLink = appleAvailable && !hasApple;
  const showProviderStatus = showGoogleSection || appleAvailable;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    isAppleSignInAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handleLinkGoogle = async () => {
    if (!isGoogleSignInAvailable()) {
      appAlert('Google Sign-In not available', GOOGLE_SIGNIN_UNAVAILABLE_MESSAGE);
      return;
    }

    setLinkingGoogle(true);
    try {
      await linkGoogle();
      appAlert('Google linked', 'You can now sign in with Google or email and password.');
    } catch (error: unknown) {
      if (error instanceof GoogleSignInCancelledError) {
        return;
      }
      appAlert(
        'Could not link Google',
        error instanceof Error ? error.message : 'Failed to link Google account'
      );
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleLinkApple = async () => {
    if (!isFirebaseConfigured()) {
      appAlert(
        'Firebase not configured',
        'Copy .env.example to .env and add your Firebase credentials.'
      );
      return;
    }

    try {
      // Do not setState before Apple sign-in — iOS requires signInAsync from the tap gesture.
      await linkApple();
      appAlert('Apple linked', 'You can now sign in with your Apple Account on this account.');
    } catch (error: unknown) {
      if (error instanceof AppleSignInCancelledError) {
        return;
      }
      appAlert(
        'Could not link Apple',
        error instanceof Error ? error.message : 'Failed to link your Apple Account'
      );
    }
  };

  const handleRequestAccountDeletion = () => {
    appAlert(
      'Request account deletion',
      `This permanently deletes your ${APP_NAME} account and associated data after we verify the request (usually within 30 days). Continue to email ${LEGAL_CONTACT_EMAIL}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            const accountEmail = user?.email?.trim() ?? '';
            const subject = encodeURIComponent(`${APP_NAME} account deletion request`);
            const body = encodeURIComponent(
              [
                'Please delete my LyVee account and associated data.',
                '',
                `Account email: ${accountEmail || '(add the email on your LyVee account)'}`,
                accountEmail ? `Display name: ${user?.name ?? ''}` : '',
                '',
                'I understand this request is permanent.',
              ]
                .filter(Boolean)
                .join('\n')
            );
            const mailto = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
            try {
              const canOpen = await Linking.canOpenURL(mailto);
              if (!canOpen) {
                appAlert(
                  'Email not available',
                  `Email ${LEGAL_CONTACT_EMAIL} with subject “${APP_NAME} account deletion request” and include the email on your account.`
                );
                return;
              }
              await Linking.openURL(mailto);
            } catch {
              appAlert(
                'Could not open email',
                `Email ${LEGAL_CONTACT_EMAIL} with subject “${APP_NAME} account deletion request” and include the email on your account.`
              );
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    appAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <MainTabScreen title="Settings">
      <SafeAreaView style={styles.container} edges={['bottom']}>
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getNameInitials(user?.name ?? '', '?')}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {memberSince ? (
              <Text style={styles.memberSince}>{memberSince}</Text>
            ) : null}
          </View>
        </View>
      </Card>

      <SectionCard title="Account" quietTitle>
        {hasPassword ? (
          <>
            <Button
              title="Change Email"
              variant="secondary"
              onPress={() => router.push('/(app)/change-email' as Href)}
              style={styles.accountButton}
            />
            <Button
              title="Change Password"
              variant="secondary"
              onPress={() => router.push('/(app)/change-password' as Href)}
            style={showProviderStatus ? styles.accountButton : undefined}
          />
          </>
        ) : (
          <Button
            title="Restore Password"
            variant="secondary"
            onPress={() => router.push('/(app)/set-password' as Href)}
            style={showProviderStatus ? styles.accountButton : undefined}
          />
        )}
        {showGoogleSection && hasGoogle ? (
          <Text style={styles.googleLinkedStatus}>Google Account Linked</Text>
        ) : null}
        {appleAvailable && hasApple ? (
          <Text style={styles.googleLinkedStatus}>Apple Account Linked</Text>
        ) : null}
        {showGoogleLink ? (
          <Button
            title="Link your Google Account"
            variant="secondary"
            onPress={handleLinkGoogle}
            loading={linkingGoogle}
            preserveTitle
            style={styles.accountButton}
          />
        ) : null}
        {showAppleLink ? (
          <Button
            title="Link your Apple Account"
            variant="secondary"
            onPress={handleLinkApple}
            preserveTitle
            style={styles.accountButton}
          />
        ) : null}
        <Button
          title="Request account deletion"
          variant="danger"
          onPress={handleRequestAccountDeletion}
          style={styles.deleteAccountButton}
        />
      </SectionCard>

      <SectionCard title="Support" quietTitle>
        <Button
          title="Send Feedback"
          variant="secondary"
          onPress={() => router.push('/(app)/feedback' as Href)}
        />
      </SectionCard>

      <SectionCard title="About" quietTitle>
        <InfoRow label="App" value={`${APP_NAME} v${appVersion}`} />
      </SectionCard>

      <View style={styles.footer}>
        <Button title="Sign out" variant="cancel" onPress={handleLogout} />
      </View>
      </SafeAreaView>
    </MainTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.sectionGap,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onPrimary,
    letterSpacing: -0.5,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm / 2,
  },
  memberSince: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  accountButton: {
    marginBottom: spacing.sm,
  },
  deleteAccountButton: {
    marginTop: spacing.sm,
  },
  googleLinkedStatus: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  footer: {
    marginTop: 'auto',
    padding: layout.screenPadding,
  },
});
