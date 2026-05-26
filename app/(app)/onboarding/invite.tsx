import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import { OnboardingProgressHeader } from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  buildInviteMessage,
  ensureGroupInvite,
  getGroupById,
  isGroupOwner,
} from '../../../src/services/groups';
import { Group } from '../../../src/types';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';
import {
  buildOnboardingHref,
  getOnboardingSetupStepProps,
  normalizeOnboardingGroupId,
  normalizeOnboardingParam,
  onboardingInviteSubtitle,
} from '../../../src/constants/onboarding';

export default function OnboardingInviteScreen() {
  const params = useLocalSearchParams<{
    groupId?: string | string[];
    groupName?: string | string[];
    inviteCode?: string | string[];
  }>();
  const groupId = normalizeOnboardingGroupId(params.groupId);
  const groupName = normalizeOnboardingParam(params.groupName);
  const inviteCode = normalizeOnboardingParam(params.inviteCode);
  const { user } = useAuth();
  const { groups, loading } = useApp();
  const inviteEnsuredRef = useRef<string | null>(null);
  const [fetchedGroup, setFetchedGroup] = useState<Group | null>(null);
  const [fetchingGroup, setFetchingGroup] = useState(false);
  const setupStepProps = getOnboardingSetupStepProps(2);

  useEffect(() => {
    if (groupId || loading) return;
    router.replace(buildOnboardingHref('/(app)/onboarding/item-types'));
  }, [groupId, loading]);

  const contextGroup = useMemo(
    () => (groupId ? groups.find((entry) => entry.id === groupId) ?? null : null),
    [groups, groupId]
  );

  const paramGroup = useMemo(() => {
    if (!groupId || !groupName || !inviteCode || !user) return null;
    return {
      id: groupId,
      name: groupName,
      inviteCode,
      ownerId: user.id,
      adminIds: [],
      members: [user.id],
      createdAt: new Date().toISOString(),
    } satisfies Group;
  }, [groupId, groupName, inviteCode, user]);

  const group = contextGroup ?? fetchedGroup ?? paramGroup;

  useEffect(() => {
    if (!groupId || contextGroup || paramGroup || loading) return;

    let cancelled = false;
    setFetchingGroup(true);

    getGroupById(groupId)
      .then((nextGroup) => {
        if (!cancelled) {
          setFetchedGroup(nextGroup);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFetchingGroup(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contextGroup, groupId, loading, paramGroup]);

  useEffect(() => {
    if (!groupId || loading || fetchingGroup || !user) return;
    const authoritativeGroup = contextGroup ?? fetchedGroup;
    if (!authoritativeGroup) return;
    if (!isGroupOwner(authoritativeGroup, user.id)) {
      router.replace(buildOnboardingHref('/(app)/onboarding/item-types', groupId));
    }
  }, [contextGroup, fetchedGroup, fetchingGroup, groupId, loading, user]);

  useEffect(() => {
    if (!group || !user || !isGroupOwner(group, user.id)) return;
    if (inviteEnsuredRef.current === group.id) return;
    inviteEnsuredRef.current = group.id;
    ensureGroupInvite(group).catch(() => {});
  }, [group, user]);

  const goNext = () => {
    router.push(buildOnboardingHref('/(app)/onboarding/item-types', groupId));
  };

  const handleShare = async () => {
    if (!group) return;
    await Share.share({ message: buildInviteMessage(group) });
  };

  if (loading || !groupId || !user) {
    return <LoadingScreen />;
  }

  if (!group) {
    if (fetchingGroup) return <LoadingScreen />;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.subtitle}>Group not found</Text>
          <Button
            title="Continue tour"
            onPress={() => router.push(buildOnboardingHref('/(app)/onboarding/item-types'))}
          />
          <Button
            title="Go back"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const authoritativeGroup = contextGroup ?? fetchedGroup;
  if (authoritativeGroup && !isGroupOwner(authoritativeGroup, user.id)) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.backRow}>
        <ScreenBackButton showChevron />
      </View>
      <OnboardingProgressHeader
        {...setupStepProps}
        title="Invite members"
        subtitle={onboardingInviteSubtitle(group.name)}
      />

      <View style={styles.body}>
        <Card style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            <Text style={styles.inviteHint}>Tap to share code & link</Text>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button
          title="Share Invite"
          variant="secondary"
          onPress={handleShare}
          style={styles.footerButton}
        />
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
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
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
