import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';
import { User } from '../types';
import { CommentReaction, CommentReactionCounts } from '../types/comments';
import {
  CommentReactionEmoji,
  QUICK_COMMENT_REACTIONS,
  sortReactionCountEntries,
  sortReactionEmojis,
} from '../constants/commentReactions';
import { colors, radius, spacing } from '../constants/theme';

interface CommentReactionSummaryProps {
  counts?: CommentReactionCounts;
  userReaction?: CommentReactionEmoji | null;
  disabled?: boolean;
  onToggleReaction: (emoji: CommentReactionEmoji) => void;
  onShowDetails?: () => void;
}

export function CommentReactionSummary({
  counts,
  userReaction,
  disabled = false,
  onToggleReaction,
  onShowDetails,
}: CommentReactionSummaryProps) {
  const entries = useMemo(() => sortReactionCountEntries(counts), [counts]);

  if (entries.length === 0) return null;

  return (
    <View style={styles.summaryRow}>
      {entries.map(([emoji, count]) => {
        const selected = userReaction === emoji;
        return (
          <TouchableOpacity
            key={emoji}
            style={[styles.summaryPill, selected && styles.summaryPillSelected]}
            onPress={() => onToggleReaction(emoji)}
            onLongPress={onShowDetails}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} reaction, ${count}`}
          >
            <Text style={styles.summaryEmoji}>{emoji}</Text>
            <Text style={[styles.summaryCount, selected && styles.summaryCountSelected]}>
              {count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface CommentReactionPickerProps {
  visible: boolean;
  userReaction?: CommentReactionEmoji | null;
  disabled?: boolean;
  onSelect: (emoji: CommentReactionEmoji) => void;
  onClose: () => void;
}

export function CommentReactionPicker({
  visible,
  userReaction,
  disabled = false,
  onSelect,
  onClose,
}: CommentReactionPickerProps) {
  const [fullPickerOpen, setFullPickerOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <View style={styles.pickerWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerRow}
        >
          {QUICK_COMMENT_REACTIONS.map((emoji) => {
            const selected = userReaction === emoji;
            return (
              <TouchableOpacity
                key={emoji}
                style={[styles.pickerButton, selected && styles.pickerButtonSelected]}
                onPress={() => onSelect(emoji)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`React with ${emoji}`}
              >
                <Text style={styles.pickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.pickerButton, styles.pickerMoreButton]}
            onPress={() => setFullPickerOpen(true)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="More reactions"
          >
            <Text style={styles.pickerMoreLabel}>+</Text>
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button">
          <Text style={styles.pickerClose}>Close</Text>
        </TouchableOpacity>
      </View>
      <EmojiPicker
        open={fullPickerOpen}
        onClose={() => setFullPickerOpen(false)}
        onEmojiSelected={(selection) => {
          onSelect(selection.emoji);
          setFullPickerOpen(false);
          onClose();
        }}
        enableSearchBar
        categoryPosition="top"
        theme={{
          backdrop: colors.overlay,
          knob: colors.border,
          container: colors.surface,
          header: colors.text,
          skinTonesContainer: colors.iconBg,
          category: {
            icon: colors.textMuted,
            iconActive: colors.primary,
            container: colors.iconBg,
            containerActive: colors.primaryLight,
          },
          search: {
            text: colors.text,
            placeholder: colors.textMuted,
            icon: colors.textMuted,
            background: colors.iconBg,
          },
          emoji: {
            selected: colors.primaryLight,
          },
        }}
      />
    </>
  );
}

interface ReactionDetailGroup {
  emoji: CommentReactionEmoji;
  reactions: CommentReaction[];
}

interface CommentReactionDetailsModalProps {
  visible: boolean;
  loading?: boolean;
  groups: ReactionDetailGroup[];
  members: User[];
  onClose: () => void;
}

export function CommentReactionDetailsModal({
  visible,
  loading = false,
  groups,
  members,
  onClose,
}: CommentReactionDetailsModalProps) {
  const memberNames = useMemo(() => {
    const byId = new Map(members.map((member) => [member.id, member.name.trim() || 'Member']));
    return byId;
  }, [members]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Reactions</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.modalLoader} />
          ) : groups.length === 0 ? (
            <Text style={styles.modalEmpty}>No reactions yet</Text>
          ) : (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {groups.map((group) => (
                <View key={group.emoji} style={styles.modalGroup}>
                  <Text style={styles.modalGroupEmoji}>{group.emoji}</Text>
                  <View style={styles.modalNamesWrap}>
                    {group.reactions.map((reaction) => (
                      <Text key={reaction.userId} style={styles.modalName}>
                        {memberNames.get(reaction.userId) ?? 'Member'}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.modalCloseLabel}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function groupCommentReactions(reactions: CommentReaction[]): ReactionDetailGroup[] {
  const grouped = new Map<string, CommentReaction[]>();

  for (const reaction of reactions) {
    const bucket = grouped.get(reaction.emoji) ?? [];
    bucket.push(reaction);
    grouped.set(reaction.emoji, bucket);
  }

  return sortReactionEmojis([...grouped.keys()]).map((emoji) => ({
    emoji,
    reactions: grouped.get(emoji) ?? [],
  }));
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.iconBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  summaryPillSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  summaryEmoji: {
    fontSize: 14,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryCountSelected: {
    color: colors.primary,
  },
  pickerWrap: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.iconBg,
    alignSelf: 'flex-start',
  },
  pickerButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonSelected: {
    backgroundColor: colors.primaryLight,
  },
  pickerMoreButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickerEmoji: {
    fontSize: 20,
  },
  pickerMoreLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  pickerClose: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalLoader: {
    marginVertical: spacing.lg,
  },
  modalEmpty: {
    fontSize: 14,
    color: colors.textMuted,
    marginVertical: spacing.md,
  },
  modalScroll: {
    maxHeight: 280,
  },
  modalGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  modalGroupEmoji: {
    fontSize: 20,
    width: 28,
  },
  modalNamesWrap: {
    flex: 1,
    gap: 4,
  },
  modalName: {
    fontSize: 15,
    color: colors.text,
  },
  modalCloseButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalCloseLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
