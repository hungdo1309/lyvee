import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { GroupCard } from '../../../src/components/GroupCard';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { KeyboardAvoidingScreen } from '../../../src/components/KeyboardAvoidingScreen';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import { createGroup, joinGroupByInviteCode } from '../../../src/services/groups';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';
import { onboardingStepLabel } from '../../../src/constants/onboarding';

export default function OnboardingGroupScreen() {
  const { user } = useAuth();
  const { groups, loading } = useApp();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goToInvite = (groupId: string) => {
    router.push(`/(app)/onboarding/invite?groupId=${groupId}` as Href);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await createGroup(groupName.trim(), user.id);
      goToInvite(group.id);
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await joinGroupByInviteCode(inviteCode.trim(), user.id);
      goToInvite(group.id);
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid invite code');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingScreen style={styles.container}>
      <View style={styles.backRow}>
        <ScreenBackButton />
      </View>
      <View style={styles.header}>
        <Text style={styles.step}>{onboardingStepLabel(1)}</Text>
        <Text style={styles.title}>Set up your group</Text>
        <Text style={styles.subtitle}>
          Create a group for your household or join one with an invite code.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Create Group"
          variant={mode === 'create' ? 'primary' : 'secondary'}
          onPress={() => setMode('create')}
          style={styles.actionButton}
        />
        <Button
          title="Join with Code"
          variant={mode === 'join' ? 'primary' : 'secondary'}
          onPress={() => setMode('join')}
          style={styles.actionButton}
        />
      </View>

      {mode === 'create' && (
        <Card style={styles.form}>
          <Input
            label="Group name"
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Home, Family"
            autoFocus
          />
          <Button title="Create & Continue" onPress={handleCreate} loading={submitting} />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => {
              setMode(null);
              setGroupName('');
            }}
            style={styles.formCancel}
          />
        </Card>
      )}

      {mode === 'join' && (
        <Card style={styles.form}>
          <Input
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="6-character code"
            autoCapitalize="characters"
            autoFocus
          />
          <Button title="Join & Continue" onPress={handleJoin} loading={submitting} />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => {
              setMode(null);
              setInviteCode('');
            }}
            style={styles.formCancel}
          />
        </Card>
      )}

      {groups.length > 0 && (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          ListHeaderComponent={
            <Text style={styles.listTitle}>Your groups</Text>
          }
          renderItem={({ item: group }) => (
            <GroupCard
              name={group.name}
              meta={`${group.members.length} member${group.members.length !== 1 ? 's' : ''}`}
              onPress={() => goToInvite(group.id)}
            />
          )}
        />
      )}
      </KeyboardAvoidingScreen>
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
  actions: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
    marginBottom: layout.sectionGap,
  },
  actionButton: {
    flex: 1,
  },
  form: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.sectionGap,
  },
  formCancel: {
    marginTop: spacing.sm,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
  },
  listTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
});
