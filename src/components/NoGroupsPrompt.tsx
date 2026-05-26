import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { EmptyState } from './EmptyState';
import {
  GROUPS_EMPTY_ICON_WRAP_SIZE,
  GROUPS_ICON_SIZES,
  GroupsIcon,
} from './GroupsIcon';
import { Button } from './Button';
import {
  navigateToCreateGroup,
  navigateToJoinGroup,
} from '../utils/groupSetupNavigation';
import { layout, spacing, colors } from '../constants/theme';

interface NoGroupsPromptContentProps {
  onJoinPress?: () => void;
  onCreatePress?: () => void;
}

export function NoGroupsPromptContent({
  onJoinPress,
  onCreatePress,
}: NoGroupsPromptContentProps) {
  const handleJoinPress = onJoinPress ?? navigateToJoinGroup;
  const handleCreatePress = onCreatePress ?? navigateToCreateGroup;

  return (
    <View style={styles.content}>
      <EmptyState
        iconNode={
          <GroupsIcon size={GROUPS_ICON_SIZES.emptyLarge} color={colors.primary} />
        }
        title="Create or Join a Group first"
        subtitle="Groups let you share items with household members and friends."
        compact
        compactTight
        iconWrapSize={GROUPS_EMPTY_ICON_WRAP_SIZE}
      />
      <View style={styles.actions}>
        <Button
          title="Join a Group"
          variant="ghost"
          onPress={handleJoinPress}
          preserveTitle
          size="sm"
          style={styles.actionButton}
        />
        <Button
          title="Create a Group"
          variant="ghost"
          onPress={handleCreatePress}
          preserveTitle
          size="sm"
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

interface NoGroupsPromptCenterProps extends NoGroupsPromptContentProps {
  style?: StyleProp<ViewStyle>;
}

export function NoGroupsPromptCenter({
  style,
  ...contentProps
}: NoGroupsPromptCenterProps) {
  return (
    <View style={[styles.centered, style]}>
      <NoGroupsPromptContent {...contentProps} />
    </View>
  );
}

export function NoGroupsPrompt(props: NoGroupsPromptContentProps) {
  return <NoGroupsPromptCenter {...props} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionButton: {
    width: '100%',
  },
});
