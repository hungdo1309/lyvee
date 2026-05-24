import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  TouchableOpacity,
  Alert,
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
  subscribeToGroup,
  buildInviteMessage,
  ensureGroupInvite,
  isGroupOwner,
} from '../../../src/services/groups';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';
import { Group } from '../../../src/types';

export default function OnboardingInviteScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const { selectGroup, completeOnboarding } = useApp();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    const unsubscribe = subscribeToGroup(groupId, (fetched) => {
      setGroup(fetched);
      setLoading(false);
      if (fetched && user && isGroupOwner(fetched, user.id)) {
        ensureGroupInvite(fetched).catch(() => {});
      }
    });
    return unsubscribe;
  }, [groupId, user]);

  const finish = async () => {
    if (!groupId || finishing) return;
    setFinishing(true);
    try {
      await selectGroup(groupId);
      await completeOnboarding();
      router.replace('/(app)/(tabs)' as Href);
    } catch (error: unknown) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not continue'
      );
      setFinishing(false);
    }
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

  const isOwner = user ? isGroupOwner(group, user.id) : false;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.backRow}>
        <ScreenBackButton />
      </View>
      <View style={styles.header}>
        <Text style={styles.step}>Step 2 of 2</Text>
        <Text style={styles.title}>Invite members</Text>
        <Text style={styles.subtitle}>
          Optional — share your invite code so others can join "{group.name}".
        </Text>
      </View>

      <View style={styles.body}>
        {isOwner ? (
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
        {isOwner && (
          <Button
            title="Share Invite"
            variant="secondary"
            onPress={handleShare}
            style={styles.footerButton}
          />
        )}
        <Button
          title="Continue"
          size="lg"
          onPress={finish}
          loading={finishing}
        />
        <Button
          title="Skip for now"
          variant="ghost"
          onPress={finish}
          disabled={finishing}
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
