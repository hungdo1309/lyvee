import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { GroupSelector } from '../../../src/components/GroupSelector';
import { NoGroupsPrompt } from '../../../src/components/NoGroupsPrompt';
import { Fab } from '../../../src/components/Fab';
import { MainTabScreen } from '../../../src/components/MainTabScreen';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { ExpenseGroupCard } from '../../../src/components/ExpenseGroupCard';
import { ExpenseEditor } from '../../../src/components/ExpenseEditor';
import {
  addExpense,
  ensureDefaultGroupExpenseGroup,
} from '../../../src/services/expenseGroups';
import { useGroupMembers, EMPTY_MEMBER_IDS } from '../../../src/hooks/useGroupMembers';
import { ExpenseGroup, GROUP_EXPENSE_NAME } from '../../../src/types/expenses';
import {
  getDefaultGroupExpenseGroup,
  getTripExpenseGroups,
  getTripTitleForExpenseGroup,
} from '../../../src/utils/expenses';
import { colors, layout, spacing, typography } from '../../../src/constants/theme';

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { groups, activeGroup, selectGroup, loading, getGroupExpenseGroups, getGroupTrips } =
    useApp();

  const expenseGroups = activeGroup ? getGroupExpenseGroups(activeGroup.id) : [];
  const trips = activeGroup ? getGroupTrips(activeGroup.id) : [];
  const { members: groupMembers } = useGroupMembers(activeGroup?.members ?? EMPTY_MEMBER_IDS);

  const [defaultGroupExpense, setDefaultGroupExpense] = useState<ExpenseGroup | null>(null);
  const [ensuringDefault, setEnsuringDefault] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);

  const tripExpenseGroups = useMemo(
    () => getTripExpenseGroups(expenseGroups, trips),
    [expenseGroups, trips]
  );

  const resolvedDefaultGroupExpense = useMemo(() => {
    return defaultGroupExpense ?? getDefaultGroupExpenseGroup(expenseGroups);
  }, [defaultGroupExpense, expenseGroups]);

  useEffect(() => {
    if (!user || !activeGroup) {
      setDefaultGroupExpense(null);
      setEnsureError(null);
      return;
    }

    const cachedDefault = getDefaultGroupExpenseGroup(expenseGroups);
    if (cachedDefault) {
      setDefaultGroupExpense(cachedDefault);
      setEnsuringDefault(false);
      setEnsureError(null);
      return;
    }

    let active = true;
    setEnsuringDefault(true);
    setEnsureError(null);

    ensureDefaultGroupExpenseGroup(user.id, activeGroup.id)
      .then((expenseGroup) => {
        if (active) {
          setDefaultGroupExpense(expenseGroup);
        }
      })
      .catch((error) => {
        if (active) {
          setEnsureError(error instanceof Error ? error.message : 'Could not load group expenses');
        }
      })
      .finally(() => {
        if (active) {
          setEnsuringDefault(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, activeGroup?.id, expenseGroups]);

  const handleGroupChange = async (groupId: string) => {
    await selectGroup(groupId);
  };

  const handleOpenExpenseGroup = (expenseGroupId: string) => {
    router.push(`/(app)/expense/${expenseGroupId}?from=expenses` as Href);
  };

  const handleAddGroupExpense = () => {
    if (!resolvedDefaultGroupExpense) return;
    setEditorVisible(true);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (groups.length === 0) {
    return (
      <MainTabScreen title="Expenses">
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <NoGroupsPrompt />
        </SafeAreaView>
      </MainTabScreen>
    );
  }

  return (
    <MainTabScreen title="Expenses">
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GroupSelector
            groups={groups}
            activeGroup={activeGroup}
            onSelect={handleGroupChange}
          />

          {activeGroup ? (
            <View style={styles.content}>
              {ensureError ? <Text style={styles.error}>{ensureError}</Text> : null}
              {resolvedDefaultGroupExpense ? (
                <ExpenseGroupCard
                  title={GROUP_EXPENSE_NAME}
                  meta={`${resolvedDefaultGroupExpense.memberIds.length} ${
                    resolvedDefaultGroupExpense.memberIds.length === 1 ? 'member' : 'members'
                  }`}
                  onPress={() => handleOpenExpenseGroup(resolvedDefaultGroupExpense.id)}
                />
              ) : ensuringDefault ? (
                <Text style={styles.loadingText}>Setting up group expenses…</Text>
              ) : null}

              {tripExpenseGroups.length > 0 ? (
                <View style={styles.tripSection}>
                  <Text style={styles.sectionHeading}>Trip Expenses</Text>
                  <View style={styles.list}>
                    {tripExpenseGroups.map((expenseGroup) => (
                      <ExpenseGroupCard
                        key={expenseGroup.id}
                        title={getTripTitleForExpenseGroup(expenseGroup, trips)}
                        subtitle="Trip expense"
                        meta={`${expenseGroup.memberIds.length} ${
                          expenseGroup.memberIds.length === 1 ? 'member' : 'members'
                        }`}
                        onPress={() => handleOpenExpenseGroup(expenseGroup.id)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {activeGroup && resolvedDefaultGroupExpense ? (
          <Fab onPress={handleAddGroupExpense} accessibilityLabel="Add group expense" />
        ) : null}
      </SafeAreaView>

      {resolvedDefaultGroupExpense ? (
        <ExpenseEditor
          visible={editorVisible}
          expenseGroup={resolvedDefaultGroupExpense}
          members={groupMembers}
          onClose={() => setEditorVisible(false)}
          onSave={async (values) => {
            if (!user) return;
            await addExpense(resolvedDefaultGroupExpense, values, user.id);
          }}
        />
      ) : null}
    </MainTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl + 56,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.caption,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripSection: {
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});
