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
import { Fab } from '../../../src/components/Fab';
import { ItemCard } from '../../../src/components/ItemCard';
import { ItemTypeFiltersBar } from '../../../src/components/ItemTypeFiltersBar';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { toggleItemComplete, deleteItem } from '../../../src/services/items';
import { collectTagsFromItems } from '../../../src/utils/tags';
import { formatAssigneeLabel, canUserCompleteTask } from '../../../src/utils/assignees';
import { formatUpcomingDayHeader } from '../../../src/utils/dates';
import {
  filterItemsByTypeAndTags,
  hasActiveItemTypeTagFilters,
  ItemTypeFilter,
} from '../../../src/utils/itemFilters';
import {
  ItemInstance,
  buildHomeUpcomingDaySections,
  getUpcomingWindowInstances,
  isCalendarInstanceActive,
} from '../../../src/utils/itemInstances';
import { colors, layout, radius, spacing, typography } from '../../../src/constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { groups, items, activeGroup, selectGroup, loading } = useApp();
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, true>>({});
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(null);

  const { members: groupMembers } = useGroupMembers(activeGroup?.members ?? []);

  useEffect(() => {
    setTypeFilter('all');
    setSelectedTags([]);
    setShowFilters(false);
    setExpandedDays({});
    setExpandedInstanceKey(null);
  }, [activeGroup?.id]);

  const groupItems = useMemo(() => {
    if (!activeGroup) return [];
    return items.filter((item) => item.groupId === activeGroup.id);
  }, [items, activeGroup]);

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

  const daySections = useMemo(() => {
    const instances = getUpcomingWindowInstances(filteredItems);
    return buildHomeUpcomingDaySections(instances);
  }, [filteredItems]);

  const handleToggleComplete = async (instance: ItemInstance) => {
    if (instance.item.type !== 'task') return;
    await toggleItemComplete(
      instance.item,
      instance.isRecurring ? instance.occurrenceDate : undefined,
      user?.id
    );
  };

  const handleEditItem = (instance: ItemInstance) => {
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

  const handleDeleteItem = async (instance: ItemInstance) => {
    await deleteItem(instance.itemId, user?.id, instance.item);
    setExpandedInstanceKey((current) =>
      current === instance.instanceKey ? null : current
    );
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

  if (loading) {
    return <LoadingScreen />;
  }

  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon="👥"
          title="Create a group first"
          subtitle="Groups let you share items with household members and friends."
          action={{
            label: 'Go to Groups',
            onPress: () => router.push('/(app)/(tabs)/groups' as Href),
          }}
        />
      </SafeAreaView>
    );
  }

  return (
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
            <View style={styles.toolbar}>
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

            <Text style={styles.sectionHeading}>Upcoming in the next two weeks</Text>

            <View style={styles.dayList}>
              {daySections.map((section) => {
                const expanded = !!expandedDays[section.dateKey];
                const count = section.instances.length;
                const hasItems = count > 0;

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
                            ? styles.dayHeaderTextHasItems
                            : styles.dayHeaderTextEmpty,
                        ]}
                      >
                        {formatUpcomingDayHeader(section.dateKey, count)}
                      </Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={hasItems ? colors.primary : colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {expanded &&
                      (count === 0 ? (
                        <Text style={styles.emptyDay}>Nothing scheduled for this day</Text>
                      ) : (
                        section.instances.map((instance) => (
                          <View key={instance.instanceKey} style={styles.itemRow}>
                            <ItemCard
                              instance={instance}
                              expanded={expandedInstanceKey === instance.instanceKey}
                              onToggleExpand={() =>
                                setExpandedInstanceKey((current) =>
                                  current === instance.instanceKey
                                    ? null
                                    : instance.instanceKey
                                )
                              }
                              onToggleComplete={
                                canUserCompleteTask(instance.item, user?.id)
                                  ? () => handleToggleComplete(instance)
                                  : undefined
                              }
                              faded={!isCalendarInstanceActive(instance)}
                              assigneeLabel={formatAssigneeLabel(
                                instance.item.assignedTo,
                                groupMembers
                              )}
                              groupName={activeGroup.name}
                              isOwner={instance.item.createdBy === user?.id}
                              onEdit={
                                instance.item.createdBy === user?.id
                                  ? () => handleEditItem(instance)
                                  : undefined
                              }
                              onDelete={
                                instance.item.createdBy === user?.id
                                  ? () => handleDeleteItem(instance)
                                  : undefined
                              }
                            />
                          </View>
                        ))
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

      {activeGroup && (
        <Fab onPress={handleCreateItem} accessibilityLabel="Add item" />
      )}
    </SafeAreaView>
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
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
    backgroundColor: colors.primaryLight,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  sectionHeading: {
    ...typography.caption,
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayList: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.xs,
  },
  daySection: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  daySectionEmpty: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  daySectionHasItems: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    color: colors.text,
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
