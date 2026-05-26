import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { appAlert } from '../../../src/utils/dialog';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { CancelButton } from '../../../src/components/CancelButton';
import { Card } from '../../../src/components/Card';
import { GroupCard } from '../../../src/components/GroupCard';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { KeyboardAvoidingScreen } from '../../../src/components/KeyboardAvoidingScreen';
import { ScreenBackButton } from '../../../src/components/ScreenBackButton';
import { OnboardingProgressHeader } from '../../../src/components/onboarding/OnboardingStepLayout';
import {
  createGroup,
  joinGroupByInviteCode,
  isGroupOwner,
} from '../../../src/services/groups';
import { Group } from '../../../src/types';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';
import {
  ONBOARDING_GROUP_SUBTITLE,
  buildOnboardingHref,
  buildOnboardingInviteHref,
  getOnboardingSetupStepProps,
} from '../../../src/constants/onboarding';

type GroupSetupMode = 'create' | 'join';

export default function OnboardingGroupScreen() {
  const { user } = useAuth();
  const { groups, loading } = useApp();
  const [mode, setMode] = useState<GroupSetupMode | null>(null);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const groupNameRef = useRef<TextInput>(null);
  const inviteCodeRef = useRef<TextInput>(null);
  const setupStepProps = getOnboardingSetupStepProps(1);

  const focusField = (target: GroupSetupMode) => {
    const ref = target === 'create' ? groupNameRef : inviteCodeRef;
    requestAnimationFrame(() => {
      ref.current?.focus();
    });
  };

  const selectMode = (target: GroupSetupMode) => {
    setMode(target);
    setTimeout(() => focusField(target), 0);
    setTimeout(() => focusField(target), 100);
    setTimeout(() => focusField(target), 300);
  };

  const clearMode = () => {
    setMode(null);
    setGroupName('');
    setInviteCode('');
  };

  const goToInvite = (group: Pick<Group, 'id' | 'name' | 'inviteCode'>) => {
    router.push(buildOnboardingInviteHref(group));
  };

  const goToTour = (groupId?: string) => {
    router.push(buildOnboardingHref('/(app)/onboarding/item-types', groupId));
  };

  const continueWithGroup = (group: Group, createdByUser: boolean) => {
    if (createdByUser || (user && isGroupOwner(group, user.id))) {
      goToInvite(group);
      return;
    }

    goToTour(group.id);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await createGroup(groupName.trim(), user.id);
      continueWithGroup(group, true);
    } catch (error: unknown) {
      appAlert('Error', error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await joinGroupByInviteCode(inviteCode.trim(), user.id);
      continueWithGroup(group, false);
    } catch (error: unknown) {
      appAlert('Error', error instanceof Error ? error.message : 'Invalid invite code');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingScreen style={styles.container}>
        <View style={styles.backRow}>
          <ScreenBackButton showChevron />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <OnboardingProgressHeader
            {...setupStepProps}
            title="Set up your group"
            subtitle={ONBOARDING_GROUP_SUBTITLE}
          />

          <View style={styles.actions}>
            <Button
              title="Create Group"
              variant={mode === 'create' ? 'primary' : 'secondary'}
              onPress={() => selectMode('create')}
              style={styles.actionButton}
            />
            <Button
              title="Join with Code"
              variant={mode === 'join' ? 'primary' : 'secondary'}
              onPress={() => selectMode('join')}
              style={styles.actionButton}
            />
          </View>

          {mode === 'create' ? (
            <Card style={styles.form}>
              <Input
                ref={groupNameRef}
                label="Group name"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g. Home, Family"
                autoFocus
                showSoftInputOnFocus
                onLayout={() => focusField('create')}
              />
              <Button title="Create & Continue" onPress={handleCreate} loading={submitting} />
              <CancelButton onPress={clearMode} style={styles.formCancel} />
            </Card>
          ) : null}

          {mode === 'join' ? (
            <Card style={styles.form}>
              <Input
                ref={inviteCodeRef}
                label="Invite code"
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="6-character code"
                autoCapitalize="characters"
                autoFocus
                showSoftInputOnFocus
                onLayout={() => focusField('join')}
              />
              <Button title="Join & Continue" onPress={handleJoin} loading={submitting} />
              <CancelButton onPress={clearMode} style={styles.formCancel} />
            </Card>
          ) : null}

          {groups.length > 0 ? (
            <View style={styles.list}>
              <Text style={styles.listTitle}>Your groups</Text>
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  name={group.name}
                  meta={`${group.members.length} member${group.members.length !== 1 ? 's' : ''}`}
                  onPress={() => continueWithGroup(group, false)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Skip for now" variant="ghost" onPress={() => goToTour()} />
        </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
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
    gap: spacing.sm,
  },
  listTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
});
