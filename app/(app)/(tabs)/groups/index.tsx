import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  InteractionManager,
} from 'react-native';
import { appAlert } from '../../../../src/utils/dialog';
import { FlatList } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../src/context/AuthContext';
import { useApp } from '../../../../src/context/AppContext';
import { Input } from '../../../../src/components/Input';
import { Button } from '../../../../src/components/Button';
import { CancelButton } from '../../../../src/components/CancelButton';
import { Card } from '../../../../src/components/Card';
import { NoGroupsPrompt } from '../../../../src/components/NoGroupsPrompt';
import { GroupCard } from '../../../../src/components/GroupCard';
import { GroupDetailContent } from '../../../../src/components/GroupDetailContent';
import { LoadingScreen } from '../../../../src/components/LoadingScreen';
import { KeyboardAvoidingScreen } from '../../../../src/components/KeyboardAvoidingScreen';
import { GroupsFabMenu } from '../../../../src/components/GroupsFabMenu';
import { createGroup, joinGroupByInviteCode } from '../../../../src/services/groups';
import { getMemberRole } from '../../../../src/utils/groupRoles';
import type { Group } from '../../../../src/types';
import {
  clearGroupSetupIntent,
  peekGroupSetupIntent,
  subscribeGroupSetupIntent,
  type GroupSetupIntent,
} from '../../../../src/utils/groupSetupNavigation';
import { colors, layout, radius, spacing, typography } from '../../../../src/constants/theme';

function focusTextInput(ref: React.RefObject<TextInput | null>) {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        ref.current?.focus();
      }, 350);
    });
  });
}

export default function GroupsScreen() {
  const { user } = useAuth();
  const { groups, loading, selectGroup } = useApp();
  const [showCreate, setShowCreate] = useState(
    () => peekGroupSetupIntent() === 'create'
  );
  const [showJoinCard, setShowJoinCard] = useState(
    () => peekGroupSetupIntent() === 'join'
  );
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const groupNameInputRef = useRef<TextInput>(null);
  const inviteCodeInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Group> | null>(null);
  const pendingFocusRef = useRef<'join' | 'create' | null>(peekGroupSetupIntent());
  const isFocusedRef = useRef(false);

  const focusCreateInput = useCallback(() => {
    focusTextInput(groupNameInputRef);
  }, []);

  const focusJoinInput = useCallback(() => {
    focusTextInput(inviteCodeInputRef);
  }, []);

  const focusPendingInput = useCallback(() => {
    const pending = pendingFocusRef.current;
    if (!pending || !isFocusedRef.current) return;

    const inputRef = pending === 'create' ? groupNameInputRef : inviteCodeInputRef;
    if (!inputRef.current) return;

    pendingFocusRef.current = null;
    if (pending === 'create') {
      focusCreateInput();
    } else {
      focusJoinInput();
    }
  }, [focusCreateInput, focusJoinInput]);

  const handleCreateSectionLayout = useCallback(() => {
    if (pendingFocusRef.current !== 'create') return;
    focusPendingInput();
  }, [focusPendingInput]);

  const handleJoinSectionLayout = useCallback(() => {
    if (pendingFocusRef.current !== 'join') return;
    focusPendingInput();
  }, [focusPendingInput]);

  const closeCreateForm = useCallback(() => {
    clearGroupSetupIntent();
    pendingFocusRef.current = null;
    setShowCreate(false);
    setGroupName('');
  }, []);

  const closeJoinForm = useCallback(() => {
    clearGroupSetupIntent();
    pendingFocusRef.current = null;
    setShowJoinCard(false);
    setInviteCode('');
  }, []);

  const scrollListToTop = useCallback((animated = true) => {
    if (groups.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    }
  }, [groups.length]);

  const applySetupIntent = useCallback((intent: GroupSetupIntent | null) => {
    if (intent === 'join') {
      setFabMenuOpen(false);
      pendingFocusRef.current = 'join';
      setShowJoinCard(true);
      setShowCreate(false);
      scrollListToTop();
      return;
    }

    if (intent === 'create') {
      setFabMenuOpen(false);
      pendingFocusRef.current = 'create';
      setShowCreate(true);
      setShowJoinCard(false);
      scrollListToTop();
    }
  }, [scrollListToTop]);

  const toggleFabMenu = useCallback(() => {
    setFabMenuOpen((open) => !open);
  }, []);

  const handleFabJoin = useCallback(() => {
    applySetupIntent('join');
  }, [applySetupIntent]);

  const handleFabCreate = useCallback(() => {
    applySetupIntent('create');
  }, [applySetupIntent]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      const intent = peekGroupSetupIntent();
      applySetupIntent(intent);
      requestAnimationFrame(() => {
        focusPendingInput();
      });

      return () => {
        isFocusedRef.current = false;
        setFabMenuOpen(false);
      };
    }, [applySetupIntent, focusPendingInput])
  );

  useEffect(() => {
    return subscribeGroupSetupIntent(() => {
      applySetupIntent(peekGroupSetupIntent());
    });
  }, [applySetupIntent]);

  useEffect(() => {
    if (!isFocusedRef.current) return;
    focusPendingInput();
  }, [showCreate, showJoinCard, focusPendingInput]);

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setSubmitting(true);
    try {
      const group = await createGroup(groupName.trim(), user.id);
      await selectGroup(group.id);
      setGroupName('');
      setShowCreate(false);
      clearGroupSetupIntent();
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
      clearGroupSetupIntent();
      setShowJoinCard(false);
      setExpandedGroupId(group.id);
    } catch (error: unknown) {
      appAlert('Error', error instanceof Error ? error.message : 'Invalid invite code');
    } finally {
      setSubmitting(false);
    }
  };

  const joinCardSection = (
    <Card style={styles.joinCard}>
      <Text style={styles.joinTitle}>Join with invite code</Text>
      <Input
        ref={inviteCodeInputRef}
        value={inviteCode}
        onChangeText={setInviteCode}
        placeholder="6-character code"
        autoCapitalize="characters"
        showSoftInputOnFocus
      />
      <Button title="Join Group" onPress={handleJoin} loading={submitting} />
      <CancelButton onPress={closeJoinForm} style={styles.formCancel} />
    </Card>
  );

  const createFormSection = (
    <Card style={styles.form}>
      <Input
        ref={groupNameInputRef}
        label="Group name"
        value={groupName}
        onChangeText={setGroupName}
        placeholder="e.g. Home, Family, Roommates"
        showSoftInputOnFocus
      />
      <Button title="Create Group" onPress={handleCreate} loading={submitting} />
      <CancelButton onPress={closeCreateForm} style={styles.formCancel} />
    </Card>
  );

  const showEmptyPrompt =
    groups.length === 0 &&
    !showCreate &&
    !showJoinCard &&
    peekGroupSetupIntent() === null;
  const showNoGroupSetup = groups.length === 0 && (showCreate || showJoinCard);

  const listHeader =
    groups.length > 0 ? (
      <View>
        {showCreate ? (
          <View onLayout={handleCreateSectionLayout}>{createFormSection}</View>
        ) : null}

        {showJoinCard ? (
          <View onLayout={handleJoinSectionLayout}>{joinCardSection}</View>
        ) : null}

        <View style={styles.summaryBar}>
          <Text style={styles.summaryCount}>{groups.length}</Text>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>
              {groups.length === 1 ? 'Group' : 'Groups'}
            </Text>
            <Text style={styles.summaryHint}>Tap a group to expand details</Text>
          </View>
        </View>
      </View>
    ) : null;

  if (loading) return <LoadingScreen />;

  if (showEmptyPrompt) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <NoGroupsPrompt />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingScreen style={styles.container}>
        {showNoGroupSetup && (
          <View style={styles.setupSection}>
            {showCreate ? (
              <View onLayout={handleCreateSectionLayout}>{createFormSection}</View>
            ) : null}
            {showJoinCard ? (
              <View onLayout={handleJoinSectionLayout}>{joinCardSection}</View>
            ) : null}
          </View>
        )}
        <FlatList
          ref={listRef}
          data={groups}
          keyExtractor={(g) => g.id}
          extraData={`${showCreate}-${showJoinCard}`}
          contentContainerStyle={styles.list}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={showCreate || showJoinCard ? 'none' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          ListHeaderComponent={listHeader}
          ListEmptyComponent={null}
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

      {groups.length > 0 && (
        <GroupsFabMenu
          open={fabMenuOpen}
          onToggle={toggleFabMenu}
          onJoin={handleFabJoin}
          onCreate={handleFabCreate}
        />
      )}
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
  setupSection: {
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
