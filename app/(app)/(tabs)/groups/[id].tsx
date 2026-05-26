import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useLocalSearchParams } from 'expo-router';
import { GroupDetailContent } from '../../../../src/components/GroupDetailContent';
import { Button } from '../../../../src/components/Button';
import { dismissFormScreen } from '../../../../src/utils/navigation';
import { colors, spacing, typography } from '../../../../src/constants/theme';
import { useApp } from '../../../../src/context/AppContext';

export default function GroupDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { groups } = useApp();
  const group = groups.find((g) => g.id === id);

  if (!id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Group not found</Text>
        <Button title="Go Back" variant="secondary" onPress={() => dismissFormScreen()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {group && (
        <View style={styles.hero}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.meta}>
            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
      <GroupDetailContent groupId={id} onLeave={() => dismissFormScreen()} onDelete={() => dismissFormScreen()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  groupName: {
    ...typography.title,
    fontSize: 24,
  },
  meta: {
    ...typography.caption,
  },
});
