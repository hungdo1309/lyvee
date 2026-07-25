import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { GroupSelector } from '../../../src/components/GroupSelector';
import { EmptyState } from '../../../src/components/EmptyState';
import { NoGroupsPrompt } from '../../../src/components/NoGroupsPrompt';
import { Fab } from '../../../src/components/Fab';
import { MainTabScreen } from '../../../src/components/MainTabScreen';
import { ItemCard } from '../../../src/components/ItemCard';
import { TripPlanItemCard } from '../../../src/components/TripPlanItemCard';
import { ItemTypeFiltersBar } from '../../../src/components/ItemTypeFiltersBar';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { useGroupExpenseSettleData } from '../../../src/hooks/useGroupExpenseSettleData';
import { HomeUnsettledExpensesSection } from '../../../src/components/HomeUnsettledExpensesSection';
import { toggleItemComplete, deleteItem } from '../../../src/services/items';
import { canManageGroup } from '../../../src/utils/groupRoles';
import { buildHomeSettleExpenseEntries } from '../../../src/utils/homeSettleExpenses';
import { collectTagsFromItems } from '../../../src/utils/tags';
import { formatAssigneeLabel, canUserCompleteTask } from '../../../src/utils/assignees';
import { formatOverdueSectionHeader, formatUpcomingDayHeader } from '../../../src/utils/dates';
import {
  filterItemsByTypeAndTags,
  hasActiveItemTypeTagFilters,
  ItemTypeFilter,
} from '../../../src/utils/itemFilters';
import {
  ItemInstance,
  getOverdueTaskInstances,
  getUpcomingWindowInstances,
  hasOverdueInstances,
  HOME_UPCOMING_DAYS,
  sortItemListInstances,
} from '../../../src/utils/itemInstances';
import {
  buildHomeUpcomingDaySchedule,
  countHomeScheduleEntries,
  getUpcomingTripPlanInstances,
  TripPlanInstance,
} from '../../../src/utils/tripInstances';
import { colors, layout, radius, spacing, typography } from '../../../src/constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { groups, activeGroup, selectGroup, loading, getGroupItems, getGroupTrips, getGroupExpenseGroups } =
    useApp();
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, true>>({});
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(null);

  const { members: groupMembers } = useGroupMembers(activeGroup?.members ?? []);

  useEffect(() => {
    setTypeFilter('all');
    setSelectedTags([]);
    setShowFilters(false);
    setExpandedDays({});
    setOverdueExpanded(false);
    setExpandedInstanceKey(null);
  }, [activeGroup?.id]);

  const groupItems = activeGroup ? getGroupItems(activeGroup.id) : [];
  const groupTrips = activeGroup ? getGroupTrips(activeGroup.id) : [];
  const groupExpenseGroups = activeGroup ? getGroupExpenseGroups(activeGroup.id) : [];

  const { visibleExpenseGroups, expensesByGroupId, settlementsByGroupId, loading: expenseSettleLoading, refreshExpenseSettleData } =
    useGroupExpenseSettleData(activeGroup, user?.id, groupExpenseGroups, groupTrips);

  const isGroupManager = Boolean(
    activeGroup && user && canManageGroup(activeGroup, user.id)
  );

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of groupMembers) {
      map.set(member.id, member.name);
    }
    return map;
  }, [groupMembers]);

  const unsettledExpenseEntries = useMemo(() => {
    if (!activeGroup || !user) return [];
    return buildHomeSettleExpenseEntries(
      activeGroup,
      user.id,
      visibleExpenseGroups,
      expensesByGroupId,
      settlementsByGroupId,
      groupTrips
    );
  }, [
    activeGroup,
    user,
    visibleExpenseGroups,
    expensesByGroupId,
    settlementsByGroupId,
    groupTrips,
  ]);

  const availableTags = useMemo(
    () => collectTagsFromItems(groupItems),
    [groupItems]
  );

  const filteredItems = useMemo(
    () =>
      filterItemsByTypeAndTags(groupItems, {
        type: typeFilter,
        tags: selectedTags,
      }),
    [groupItems, typeFilter, selectedTags]
  );

  const hasActiveFilters = useMemo(
    () => hasActiveItemTypeTagFilters({ type: typeFilter, tags: selectedTags }),
    [typeFilter, selectedTags]
  );

  const overdueInstances = useMemo(
    () => getOverdueTaskInstances(filteredItems),
    [filteredItems]
  );

  const daySections = useMemo(() => {
    const instances = getUpcomingWindowInstances(filteredItems, HOME_UPCOMING_DAYS, {
      includeExpired: true,
    });
    const tripInstances = getUpcomingTripPlanInstances(groupTrips, HOME_UPCOMING_DAYS);
    return buildHomeUpcomingDaySchedule(instances, tripInstances, HOME_UPCOMING_DAYS).map(
      (section) => ({
        ...section,
        instances: sortItemListInstances(section.itemInstances),
      })
    );
  }, [filteredItems, groupTrips]);

  const handleToggleComplete = async (instance: ItemInstance) => {
    if (instance.item.type !== 'task') return;
    await toggleItemComplete(
      instance.item,
      instance.isRecurring ? instance.occurrenceDate : undefined,
      user?.id
    );
  };

  const handleOpenItem = (instance: ItemInstance) => {
    router.push({
      pathname: '/(app)/item/[id]',
      params: {
        id: instance.itemId,
        ...(instance.occurrenceDate
          ? { occurrence: instance.occurrenceDate }
          : {}),
      },
    });
  };

  const handleEditItem = (instance: ItemInstance) => {
    router.push({
      pathname: '/(app)/item/[id]',
      params: {
        id: instance.itemId,
        edit: '1',
        ...(instance.occurrenceDate
          ? { occurrence: instance.occurrenceDate }
          : {}),
      },
    });
  };

  const handleDeleteItem = async (instance: ItemInstance) => {
    await deleteItem(instance.itemId, user?.id, instance.item);
    setExpandedInstanceKey((current) =>
      current === instance.instanceKey ? null : current
    );
  };

  const handleOpenTripPlanItem = (instance: TripPlanInstance) => {
    router.push({
      pathname: '/(app)/trip/[id]',
      params: {
        id: instance.tripId,
        date: instance.dateKey,
        entryId: instance.entry.id,
      },
    });
  };

  const handleGroupChange = async (groupId: string) => {
    await selectGroup(groupId);
    setExpandedInstanceKey(null);
  };

  const handleCreateItem = () => {
    router.push({
      pathname: '/(app)/item/create',
      params: { groupId: activeGroup?.id ?? '' },
    });
  };

  const toggleDay = (dateKey: string) => {
    setExpandedDays((current) => {
      if (current[dateKey]) {
        const next = { ...current };
        delete next[dateKey];
        return next;
      }
      return { ...current, [dateKey]: true };
    });
  };

  const renderItemInstance = (instance: ItemInstance) => (
    <View key={instance.instanceKey} style={styles.itemRow}>
      <ItemCard
        instance={instance}
        expanded={expandedInstanceKey === instance.instanceKey}
        onToggleExpand={() =>
          setExpandedInstanceKey((current) =>
            current === instance.instanceKey ? null : instance.instanceKey
          )
        }
        onView={() => handleOpenItem(instance)}
        onToggleComplete={
          canUserCompleteTask(instance.item, user?.id)
            ? () => handleToggleComplete(instance)
            : undefined
        }
        faded={instance.completed}
        assigneeLabel={formatAssigneeLabel(instance.item.assignedTo, groupMembers)}
        groupName={activeGroup?.name}
        isOwner={instance.item.createdBy === user?.id}
        onEdit={
          instance.item.createdBy === user?.id ? () => handleEditItem(instance) : undefined
        }
        onDelete={
          instance.item.createdBy === user?.id ? () => handleDeleteItem(instance) : undefined
        }
      />
    </View>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (groups.length === 0) {
    return (
      <MainTabScreen title="Home">
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <NoGroupsPrompt />
        </SafeAreaView>
      </MainTabScreen>
    );
  }

  return (
    <MainTabScreen title="Home">
      <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <GroupSelector
          groups={groups}
          activeGroup={activeGroup}
          onSelect={handleGroupChange}
        />

        {activeGroup && (
          <>
            {overdueInstances.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeading}>Overdue</Text>
                </View>
                <View style={styles.dayList}>
                  <View style={[styles.daySection, styles.daySectionOverdue]}>
                    <TouchableOpacity
                      style={styles.dayHeader}
                      onPress={() => setOverdueExpanded((value) => !value)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: overdueExpanded }}
                    >
                      <Text style={[styles.dayHeaderText, styles.dayHeaderTextOverdue]}>
                        {formatOverdueSectionHeader(overdueInstances.length)}
                      </Text>
                      <Ionicons
                        name={overdueExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.error}
                      />
                    </TouchableOpacity>

                    {overdueExpanded
                      ? overdueInstances.map((instance) => renderItemInstance(instance))
                      : null}
                  </View>
                </View>
              </>
            ) : null}

            {user && !expenseSettleLoading && unsettledExpenseEntries.length > 0 ? (
              <HomeUnsettledExpensesSection
                entries={unsettledExpenseEntries}
                memberNameById={memberNameById}
                viewerUserId={user.id}
                isManager={isGroupManager}
                onSettled={refreshExpenseSettleData}
              />
            ) : null}

            <View
              style={[
                styles.sectionHeader,
                (overdueInstances.length > 0 || unsettledExpenseEntries.length > 0) &&
                  styles.sectionHeaderSpaced,
              ]}
            >
              <Text style={styles.sectionHeading}>Upcoming in the next two weeks</Text>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  (showFilters || hasActiveFilters) && styles.filterButtonActive,
                ]}
                onPress={() => setShowFilters((value) => !value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    (showFilters || hasActiveFilters) && styles.filterButtonTextActive,
                  ]}
                >
                  Filter
                </Text>
              </TouchableOpacity>
            </View>

            {showFilters && (
              <ItemTypeFiltersBar
                type={typeFilter}
                onTypeChange={setTypeFilter}
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />
            )}

            <View style={styles.dayList}>
              {daySections.map((section) => {
                const expanded = !!expandedDays[section.dateKey];
                const count = countHomeScheduleEntries(section);
                const hasItems = count > 0;
                const sectionOverdue = hasOverdueInstances(section.instances);

                return (
                  <View
                    key={section.dateKey}
                    style={[
                      styles.daySection,
                      hasItems ? styles.daySectionHasItems : styles.daySectionEmpty,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.dayHeader}
                      onPress={() => toggleDay(section.dateKey)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                    >
                      <Text
                        style={[
                          styles.dayHeaderText,
                          hasItems
                            ? sectionOverdue
                              ? styles.dayHeaderTextOverdue
                              : styles.dayHeaderTextHasItems
                            : styles.dayHeaderTextEmpty,
                        ]}
                      >
                        {formatUpcomingDayHeader(section.dateKey, count)}
                      </Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={
                          hasItems
                            ? sectionOverdue
                              ? colors.error
                              : colors.primary
                            : colors.textSecondary
                        }
                      />
                    </TouchableOpacity>

                    {expanded &&
                      (count === 0 ? (
                        <Text style={styles.emptyDay}>Nothing scheduled for this day</Text>
                      ) : (
                        <>
                          {section.instances.map((instance) => renderItemInstance(instance))}
                          {section.tripInstances.map((instance) => (
                            <View key={instance.instanceKey} style={styles.itemRow}>
                              <TripPlanItemCard
                                instance={instance}
                                groupName={activeGroup.name}
                                onPress={() => handleOpenTripPlanItem(instance)}
                              />
                            </View>
                          ))}
                        </>
                      ))}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {!activeGroup && (
          <EmptyState
            icon="🏠"
            title="Select a group"
            subtitle="Choose a group to see what's coming up."
            compact
          />
        )}
      </ScrollView>

      {groups.length > 0 && activeGroup ? (
        <Fab onPress={handleCreateItem} accessibilityLabel="Add item" />
      ) : null}
      </SafeAreaView>
    </MainTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl + 56,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.md,
  },
  filterButton: {
    flexShrink: 0,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 104,
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primaryDark,
  },
  sectionHeading: {
    ...typography.sectionTitle,
    flex: 1,
    marginBottom: 0,
  },
  dayList: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.xxs,
  },
  daySection: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  daySectionEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  daySectionHasItems: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  daySectionOverdue: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorMuted,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdTight,
  },
  dayHeaderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dayHeaderTextEmpty: {
    fontWeight: '500',
    color: colors.textMuted,
  },
  dayHeaderTextHasItems: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  dayHeaderTextOverdue: {
    fontWeight: '700',
    color: colors.error,
  },
  emptyDay: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  itemRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
