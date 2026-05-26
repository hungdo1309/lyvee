import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { appAlert } from '../src/utils/dialog';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useApp } from '../src/context/AppContext';
import { joinGroupByInviteCode } from '../src/services/groups';
import { colors, spacing } from '../src/constants/theme';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { selectGroup } = useApp();
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading || joining) return;

    if (!code) {
      appAlert('Invalid link', 'No invite code found.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
      return;
    }

    if (!user) {
      router.replace(`/(auth)/login?redirect=join&code=${code}`);
      return;
    }

    setJoining(true);
    joinGroupByInviteCode(code, user.id)
      .then(async (group) => {
        await selectGroup(group.id);
        router.replace('/(app)/(tabs)' as Href);
      })
      .catch((error: unknown) => {
        appAlert(
          'Could not join',
          error instanceof Error ? error.message : 'Invalid invite',
          [{ text: 'OK', onPress: () => router.replace('/(app)/(tabs)' as Href) }]
        );
      })
      .finally(() => setJoining(false));
  }, [authLoading, user, code, joining]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Joining group…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
