import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../../src/context/AppContext';
import { useAuth } from '../../../src/context/AuthContext';
import { ItemCard } from '../../../src/components/ItemCard';
import { GroupSelector } from '../../../src/components/GroupSelector';
import { EmptyState } from '../../../src/components/EmptyState';
import { Fab } from '../../../src/components/Fab';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { toggleItemComplete, deleteItem } from '../../../src/services/items';
import {
  getGroupItemListSections,
  getActiveListInstance,
  getExpiredListInstance,
  ItemInstance,
} from '../../../src/utils/itemInstances';
import { collectTagsFromItems, itemMatchesTagFilter } from '../../../src/utils/tags';
import { TagFilterBar } from '../../../src/components/TagFilterBar';
import { useGroupMembers } from '../../../src/hooks/useGroupMembers';
import { formatAssigneeLabel } from '../../../src/utils/assignees';
import { colors, itemTypeConfig, layout, radius, spacing, typography } from '../../../src/constants/theme';
import { ItemType } from '../../../src/types';

const FILTERS: (ItemType | 'all')[] = ['all', 'task', 'activity', 'document'];

function getFilterColor(filter: ItemType | 'all'): string {
  if (filter === 'all') return colors.primary;
  return itemTypeConfig[filter].color;
}

export default function ItemsScreen() {
  const { groups, items, activeGroup, selectGroup, loading } = useApp();
  const { user } = useAuth();
  const [filter, setFilter] = useState<ItemType | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [expandedInstanceKey, setExpandedInstanceKey] = useState<string | null>(null);
  const { members: groupMembers } = useGroupMembers(activeGroup?.members ?? []);

  useEffect(() => {
    setShowExpired(false);
    setExpandedInstanceKey(null);
  }, [activeGroup?.id]);

  const handleTypeFilter = (next: ItemType | 'all') => {
    setFilter(next);
    setShowExpired(false);
    setExpandedInstanceKey(null);
  };

  const groupItems = useMemo(
    () =>
      activeGroup
        ? items.filter((i) => i.groupId === activeGroup.id)
        : items,
    [items, activeGroup]
  );

  const availableTags = useMemo(
    () => collectTagsFromItems(groupItems),
    [groupItems]
  );

  const expiredCountForFilter = useMemo(
    () =>
      groupItems.filter((item) => {
        if (filter !== 'all' && item.type !== filter) return false;
        return !getActiveListInstance(item) && getExpiredListInstance(item);
      }).length,
    [groupItems, filter]
  );

  const hasExpiredInGroup = useMemo(
    () =>
      groupItems.some(
        (item) => !getActiveListInstance(item) && getExpiredListInstance(item)
      ),
    [groupItems]
  );

  const listSections = useMemo(() => {
    const sections = getGroupItemListSections(groupItems, { includeExpired: showExpired });

    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter((inst) => {
          if (filter !== 'all' && inst.item.type !== filter) return false;
          if (selectedTags.length > 0 && !itemMatchesTagFilter(inst.item, selectedTags)) {
            return false;
          }
          return true;
        }),
      }))
      .filter((section) => section.data.length > 0);
  }, [groupItems, showExpired, filter, selectedTags]);

  const handleToggleComplete = async (instance: ItemInstance) => {
    if (instance.item.type !== 'task') return;
    await toggleItemComplete(
      instance.item,
      instance.isRecurring ? instance.occurrenceDate : undefined,
      user?.id
    );
  };

  const handleCreateItem = () => {
    router.push({
      pathname: '/(app)/item/create',
      params: { groupId: activeGroup?.id ?? '' },
    });
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
    await deleteItem(instance.itemId, user?.id);
    setExpandedInstanceKey((current) =>
      current === instance.instanceKey ? null : current
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {groups.length > 0 && (
        <GroupSelector
          groups={groups}
          activeGroup={activeGroup}
          onSelect={selectGroup}
        />
      )}

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const selected = filter === f;
          const typeColor = getFilterColor(f);
          const label =
            f === 'all' ? 'All' : itemTypeConfig[f].label;

          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                selected && {
                  backgroundColor: typeColor + '20',
                  borderColor: typeColor,
                },
              ]}
              onPress={() => handleTypeFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && { color: typeColor, fontWeight: '600' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {groups.length > 0 && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              showExpired && styles.expiredFilterChipActive,
            ]}
            onPress={() => setShowExpired((v) => !v)}
          >
            <Text
              style={[
                styles.filterText,
                showExpired && styles.expiredFilterTextActive,
              ]}
            >
              Includes Expired
              {!showExpired && expiredCountForFilter > 0
                ? ` · ${expiredCountForFilter}`
                : ''}
            </Text>
          </TouchableOpacity>
        )}
        {availableTags.length > 0 && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              (showTagFilter || selectedTags.length > 0) && styles.tagFilterChipActive,
            ]}
            onPress={() => setShowTagFilter((v) => !v)}
          >
            <Text
              style={[
                styles.filterText,
                (showTagFilter || selectedTags.length > 0) && styles.tagFilterTextActive,
              ]}
            >
              Tags{selectedTags.length > 0 ? ` · ${selectedTags.length}` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(showTagFilter && availableTags.length > 0) && (
        <TagFilterBar
          availableTags={availableTags}
          selectedTags={selectedTags}
          onChange={setSelectedTags}
          onClear={() => {
            setSelectedTags([]);
            setShowTagFilter(false);
          }}
        />
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No items yet"
          subtitle="Create a group to start adding shared items."
          action={{
            label: 'Go to Groups',
            onPress: () => router.push('/(app)/(tabs)/groups' as Href),
          }}
          compact
        />
      ) : (
        <SectionList
          style={styles.listContainer}
          sections={listSections}
          keyExtractor={(instance) => instance.instanceKey}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item: instance, section }) => (
            <ItemCard
              instance={instance}
              expanded={expandedInstanceKey === instance.instanceKey}
              onToggleExpand={() =>
                setExpandedInstanceKey((current) =>
                  current === instance.instanceKey ? null : instance.instanceKey
                )
              }
              onToggleComplete={() => handleToggleComplete(instance)}
              faded={section.key === 'expired'}
              assigneeLabel={formatAssigneeLabel(instance.item.assignedTo, groupMembers)}
              groupName={activeGroup?.name}
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
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="✨"
              title={showExpired ? 'No items found' : 'No active items'}
              subtitle={
                showExpired
                  ? expiredCountForFilter === 0
                    ? 'No expired items for this filter.'
                    : 'Tap + to create your first item.'
                  : hasExpiredInGroup
                    ? 'Turn on Includes Expired to see past items.'
                    : 'Tap + to create your first item.'
              }
              compact
            />
          }
        />
      )}

      {groups.length > 0 && (
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    flexShrink: 0,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tagFilterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tagFilterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  expiredFilterChipActive: {
    backgroundColor: colors.textMuted + '20',
    borderColor: colors.textMuted,
  },
  expiredFilterTextActive: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl + 56,
    flexGrow: 1,
  },
});
