import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useApp } from '../../../src/context/AppContext';
import { CalendarView } from '../../../src/components/CalendarView';
import { CalendarFiltersBar } from '../../../src/components/CalendarFilters';
import { GroupSelector } from '../../../src/components/GroupSelector';
import { EmptyState } from '../../../src/components/EmptyState';
import { NoGroupsPrompt } from '../../../src/components/NoGroupsPrompt';
import { Fab } from '../../../src/components/Fab';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { toggleItemComplete, deleteItem } from '../../../src/services/items';
import {
  CalendarFilters,
  DEFAULT_CALENDAR_FILTERS,
  filterItemsByCalendarFilters,
  hasActiveCalendarFilters,
} from '../../../src/utils/itemFilters';
import { collectTagsFromItems } from '../../../src/utils/tags';
import {
  ItemInstance,
  getMonthInstanceCounts,
  formatMonthItemSummary,
} from '../../../src/utils/itemInstances';
import { format, parseISO } from 'date-fns';
import { colors, layout, radius, spacing, typography } from '../../../src/constants/theme';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { groups, items, activeGroup, selectGroup, loading } = useApp();
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { members: groupMembers } = useGroupMembers(activeGroup?.members ?? []);

  const groupItems = useMemo(() => {
    if (!activeGroup) return [];
    return items.filter((item) => item.groupId === activeGroup.id);
  }, [items, activeGroup]);

  const availableTags = useMemo(
    () => collectTagsFromItems(groupItems),
    [groupItems]
  );

  const filteredItems = useMemo(
    () => filterItemsByCalendarFilters(groupItems, filters, user?.id),
    [groupItems, filters, user?.id]
  );

  const monthItemSummary = useMemo(() => {
    const month = parseISO(visibleMonth);
    const counts = getMonthInstanceCounts(filteredItems, month, {
      includeExpired: filters.showExpired,
    });
    return formatMonthItemSummary(month, counts);
  }, [filteredItems, visibleMonth, filters.showExpired]);

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
  };

  const handleGroupChange = async (groupId: string) => {
    await selectGroup(groupId);
    setFilters(DEFAULT_CALENDAR_FILTERS);
  };

  const handleCreateItem = () => {
    router.push({
      pathname: '/(app)/item/create',
      params: { groupId: activeGroup?.id ?? '', date: selectedDate },
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <NoGroupsPrompt />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <GroupSelector
          groups={groups}
          activeGroup={activeGroup}
          onSelect={handleGroupChange}
        />

        {activeGroup && (
          <>
            <View style={styles.calendarToolbar}>
              <Text style={styles.monthSummary} numberOfLines={2}>
                {monthItemSummary}
              </Text>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  (showFilters || hasActiveCalendarFilters(filters)) &&
                    styles.filterButtonActive,
                ]}
                onPress={() => setShowFilters((v) => !v)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    (showFilters || hasActiveCalendarFilters(filters)) &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  Filter
                </Text>
              </TouchableOpacity>
            </View>

            {showFilters && (
              <CalendarFiltersBar
                members={groupMembers}
                currentUserId={user?.id}
                filters={filters}
                onChange={setFilters}
                availableTags={availableTags}
              />
            )}

            <CalendarView
              items={filteredItems}
              onToggleComplete={handleToggleComplete}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              groupMembers={groupMembers}
              groupName={activeGroup?.name}
              userId={user?.id}
              visibleMonth={visibleMonth}
              onVisibleMonthChange={setVisibleMonth}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              includeExpired={filters.showExpired}
            />
          </>
        )}

        {!activeGroup && (
          <EmptyState
            icon="📅"
            title="Select a group"
            subtitle="Choose a group to get started."
            compact
          />
        )}
      </ScrollView>

      <Fab onPress={handleCreateItem} accessibilityLabel="Add item" />
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
  calendarToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  monthSummary: {
    ...typography.caption,
    flex: 1,
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
});
