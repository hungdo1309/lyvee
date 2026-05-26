import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import {
  buildInviteMessage,
  ensureGroupInvite,
  canManageGroup,
} from '../../../src/services/groups';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';
import { onboardingStepLabel } from '../../../src/constants/onboarding';

export default function OnboardingInviteScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const { groups, loading } = useApp();
  const inviteEnsuredRef = useRef<string | null>(null);

  const group = useMemo(
    () => groups.find((entry) => entry.id === groupId) ?? null,
    [groups, groupId]
  );

  useEffect(() => {
    if (!group || !user || !canManageGroup(group, user.id)) return;
    if (inviteEnsuredRef.current === group.id) return;
    inviteEnsuredRef.current = group.id;
    ensureGroupInvite(group).catch(() => {});
  }, [group, user]);

  const goNext = () => {
    router.push(`/(app)/onboarding/item-types?groupId=${groupId}` as Href);
  };

  const handleShare = async () => {
    if (!group) return;
    await Share.share({ message: buildInviteMessage(group) });
  };

  if (loading) return <LoadingScreen />;

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.subtitle}>Group not found</Text>
          <Button
            title="Go back"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canInvite = user ? canManageGroup(group, user.id) : false;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.backRow}>
        <ScreenBackButton />
      </View>
      <View style={styles.header}>
        <Text style={styles.step}>{onboardingStepLabel(2)}</Text>
        <Text style={styles.title}>Invite members</Text>
        <Text style={styles.subtitle}>
          Optional — share your invite code so others can join "{group.name}".
        </Text>
      </View>

      <View style={styles.body}>
        {canInvite ? (
          <Card style={styles.inviteCard}>
            <Text style={styles.inviteLabel}>Invite code</Text>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.inviteCode}>{group.inviteCode}</Text>
              <Text style={styles.inviteHint}>Tap to share code & link</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.inviteCard}>
            <Text style={styles.inviteHint}>
              Ask the group owner for an invite code to add more members later.
            </Text>
          </Card>
        )}
      </View>

      <View style={styles.footer}>
        {canInvite && (
          <Button
            title="Share Invite"
            variant="secondary"
            onPress={handleShare}
            style={styles.footerButton}
          />
        )}
        <Button title="Continue" size="lg" onPress={goNext} />
        <Button
          title="Skip for now"
          variant="ghost"
          onPress={goNext}
          style={styles.skip}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backRow: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
    gap: spacing.md,
  },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  step: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  body: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    justifyContent: 'center',
  },
  inviteCard: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  inviteLabel: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 4,
    textAlign: 'center',
  },
  inviteHint: {
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  footerButton: {
    marginBottom: spacing.sm,
  },
  skip: {
    marginTop: spacing.sm,
  },
});
