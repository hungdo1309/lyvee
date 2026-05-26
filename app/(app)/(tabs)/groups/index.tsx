import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  InteractionManager,
  Platform,
} from 'react-native';
import { appAlert } from '../../../../src/utils/dialog';
import { FlatList } from 'react-native-gesture-handler';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../src/context/AuthContext';
import { useApp } from '../../../../src/context/AppContext';
import { Input } from '../../../../src/components/Input';
import { Button } from '../../../../src/components/Button';
import { CancelButton } from '../../../../src/components/CancelButton';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { GroupCard } from '../../../../src/components/GroupCard';
import { GroupDetailContent } from '../../../../src/components/GroupDetailContent';
import { LoadingScreen } from '../../../../src/components/LoadingScreen';
import { KeyboardAvoidingScreen } from '../../../../src/components/KeyboardAvoidingScreen';
import { Fab } from '../../../../src/components/Fab';
import { createGroup, joinGroupByInviteCode } from '../../../../src/services/groups';
import { getMemberRole } from '../../../../src/utils/groupRoles';
import { colors, layout, radius, spacing, typography } from '../../../../src/constants/theme';

export default function GroupsScreen() {
  const { user } = useAuth();
  const { groups, loading, selectGroup } = useApp();
  const { create } = useLocalSearchParams<{ create?: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const groupNameInputRef = useRef<TextInput>(null);
  const skipNextFocusResetRef = useRef(false);

  const scheduleCreateInputFocus = useCallback((delayMs = 150) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => groupNameInputRef.current?.focus(), delayMs);
    });
  }, []);

  const openCreateForm = useCallback(() => {
    setShowCreate(true);
    scheduleCreateInputFocus(150);
  }, [scheduleCreateInputFocus]);

  useFocusEffect(
    useCallback(() => {
      if (create === '1') {
        skipNextFocusResetRef.current = true;
        setShowCreate(true);
        scheduleCreateInputFocus(500);
        router.replace('/(app)/(tabs)/groups' as Href);
        return () => {
          setShowCreate(false);
        };
      }

      if (skipNextFocusResetRef.current) {
        skipNextFocusResetRef.current = false;
        return () => {
          setShowCreate(false);
        };
      }

      setShowCreate(false);
      setGroupName('');

      return () => {
        setShowCreate(false);
      };
    }, [create, scheduleCreateInputFocus])
  );

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await createGroup(groupName.trim(), user.id);
      await selectGroup(group.id);
      setGroupName('');
      setShowCreate(false);
      setExpandedGroupId(group.id);
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
      await selectGroup(group.id);
      setInviteCode('');
      setExpandedGroupId(group.id);
    } catch (error: unknown) {
      appAlert('Error', error instanceof Error ? error.message : 'Invalid invite code');
    } finally {
      setSubmitting(false);
    }
  };

  const listHeader = (
    <View>
      <Card style={styles.joinCard}>
        <Text style={styles.joinTitle}>Join with invite code</Text>
        <Input
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="6-character code"
          autoCapitalize="characters"
        />
        <Button title="Join Group" onPress={handleJoin} loading={submitting} />
      </Card>

      {groups.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryCount}>{groups.length}</Text>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              {groups.length === 1 ? 'Group' : 'Groups'}
            </Text>
            <Text style={styles.summaryHint}>Tap a group to expand details</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingScreen style={styles.container}>
        {showCreate && (
          <View style={styles.createSection}>
            <Card style={styles.form}>
              <Input
                ref={groupNameInputRef}
                label="Group name"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g. Home, Family, Roommates"
              />
              <Button title="Create Group" onPress={handleCreate} loading={submitting} />
              <CancelButton
                onPress={() => {
                  setShowCreate(false);
                  setGroupName('');
                }}
                style={styles.formCancel}
              />
            </Card>
          </View>
        )}
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={showCreate ? 'none' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="👥"
              title="No groups yet"
              subtitle="Create a group for your household or join one with an invite code."
              compact
            />
          }
          renderItem={({ item: group }) => {
            const role = user ? getMemberRole(group, user.id) : null;
            const roleLabel =
              role === 'owner' ? ' · You own this' : role === 'admin' ? ' · Admin' : '';
            const expanded = expandedGroupId === group.id;

            return (
              <View>
                {expanded ? (
                  <View style={styles.expandedGroup}>
                    <GroupCard
                      name={group.name}
                      meta={`${group.members.length} member${group.members.length !== 1 ? 's' : ''}${roleLabel}`}
                      expanded
                      onPress={() => setExpandedGroupId(null)}
                      style={styles.expandedGroupCard}
                    />
                    <View style={styles.expandedGroupDetail}>
                      <GroupDetailContent
                        groupId={group.id}
                        onLeave={() => setExpandedGroupId(null)}
                        onDelete={() => setExpandedGroupId(null)}
                      />
                    </View>
                  </View>
                ) : (
                  <GroupCard
                    name={group.name}
                    meta={`${group.members.length} member${group.members.length !== 1 ? 's' : ''}${roleLabel}`}
                    onPress={() => setExpandedGroupId(group.id)}
                  />
                )}
              </View>
            );
          }}
        />
      </KeyboardAvoidingScreen>

      <Fab onPress={openCreateForm} accessibilityLabel="Create group" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  joinCard: {
    marginBottom: spacing.md,
  },
  joinTitle: {
    ...typography.heading,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  createSection: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.md,
  },
  formCancel: {
    marginTop: spacing.sm,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCount: {
    minWidth: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 40,
    overflow: 'hidden',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  summaryHint: {
    ...typography.caption,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl + 56,
    flexGrow: 1,
  },
  expandedGroup: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    marginBottom: layout.listGap,
    overflow: 'hidden',
  },
  expandedGroupCard: {
    marginBottom: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  expandedGroupDetail: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
