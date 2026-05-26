import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { appAlert } from '../../src/utils/dialog';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useApp } from '../../src/context/AppContext';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { GroupsIcon } from '../../src/components/GroupsIcon';
import { GroupCard } from '../../src/components/GroupCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { CancelButton } from '../../src/components/CancelButton';
import { createGroup, joinGroupByInviteCode } from '../../src/services/groups';
import { countActiveItems, formatActiveItemCount } from '../../src/utils/itemInstances';
import { APP_NAME } from '../../src/constants/app';
import { colors, layout, spacing, typography } from '../../src/constants/theme';

export default function SelectGroupScreen() {
  const { user } = useAuth();
  const { groups, items, loading, selectGroup } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getActiveItemLabel = (groupId: string) =>
    formatActiveItemCount(
      countActiveItems(items.filter((item) => item.groupId === groupId))
    );

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await createGroup(groupName.trim(), user.id);
      setSelectedId(group.id);
      setGroupName('');
      setShowCreate(false);
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
      setSelectedId(group.id);
      setInviteCode('');
      setShowJoin(false);
    } catch (error: unknown) {
      appAlert('Error', error instanceof Error ? error.message : 'Invalid invite code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedId) return;
    await selectGroup(selectedId);
    router.replace('/(app)/(tabs)' as Href);
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {router.canGoBack() && (
        <View style={styles.backRow}>
          <CancelButton size="sm" onPress={() => router.back()} />
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.logo}>{APP_NAME}</Text>
        <Text style={styles.title}>Choose a group</Text>
        <Text style={styles.subtitle}>
          Hi {user?.name?.split(' ')[0]}, pick a group to continue.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Create Group"
          variant="secondary"
          onPress={() => {
            setShowCreate(true);
            setShowJoin(false);
          }}
          style={styles.actionButton}
        />
        <Button
          title="Join with Code"
          variant="secondary"
          onPress={() => {
            setShowJoin(true);
            setShowCreate(false);
          }}
          style={styles.actionButton}
        />
      </View>

      {showCreate && (
        <Card style={styles.form}>
          <Input
            label="Group name"
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Home, Family, Roommates"
          />
          <Button title="Create" onPress={handleCreate} loading={submitting} />
          <CancelButton
            onPress={() => {
              setShowCreate(false);
              setGroupName('');
            }}
            style={styles.formCancel}
          />
        </Card>
      )}

      {showJoin && (
        <Card style={styles.form}>
          <Input
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="6-character code"
            autoCapitalize="characters"
          />
          <Button title="Join Group" onPress={handleJoin} loading={submitting} />
          <CancelButton
            onPress={() => {
              setShowJoin(false);
              setInviteCode('');
            }}
            style={styles.formCancel}
          />
        </Card>
      )}

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            iconNode={<GroupsIcon />}
            title="No groups yet"
            subtitle="Create a group or join one with an invite code to get started."
            compact
          />
        }
        renderItem={({ item: group }) => (
          <GroupCard
            name={group.name}
            meta={`${group.members.length} member${group.members.length !== 1 ? 's' : ''} · ${getActiveItemLabel(group.id)}`}
            selected={selectedId === group.id}
            selectionMode
            onPress={() => setSelectedId(group.id)}
          />
        )}
      />

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedId}
          size="lg"
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
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  logo: {
    ...typography.title,
    fontSize: 28,
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
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
