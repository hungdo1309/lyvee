/** Messenger-style quick reactions shown in the long-press tray. */
export const QUICK_COMMENT_REACTIONS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
] as const;

/** @deprecated Use QUICK_COMMENT_REACTIONS */
export const COMMENT_REACTIONS = QUICK_COMMENT_REACTIONS;

export type QuickCommentReaction = (typeof QUICK_COMMENT_REACTIONS)[number];
export type CommentReactionEmoji = string;

const QUICK_REACTION_SET = new Set<string>(QUICK_COMMENT_REACTIONS);

export function isQuickCommentReaction(value: string): value is QuickCommentReaction {
  return QUICK_REACTION_SET.has(value);
}

export function isValidReactionEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 8) return false;
  return !/^[\x00-\x7F]+$/.test(trimmed);
}

export function isCommentReactionEmoji(value: string): value is CommentReactionEmoji {
  return isValidReactionEmoji(value);
}

export function getReactionCountEntries(
  counts?: Partial<Record<string, number>>
): Array<[string, number]> {
  if (!counts) return [];
  return Object.entries(counts).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
  );
}

export function sortReactionEmojis(emojis: string[]): string[] {
  const quickOrder = new Map<string, number>(
    QUICK_COMMENT_REACTIONS.map((emoji, index) => [emoji, index])
  );

  return [...emojis].sort((left, right) => {
    const leftQuick = quickOrder.get(left);
    const rightQuick = quickOrder.get(right);
    if (leftQuick !== undefined && rightQuick !== undefined) return leftQuick - rightQuick;
    if (leftQuick !== undefined) return -1;
    if (rightQuick !== undefined) return 1;
    return left.localeCompare(right);
  });
}

export function sortReactionCountEntries(
  counts?: Partial<Record<string, number>>
): Array<[string, number]> {
  const entries = getReactionCountEntries(counts);
  return entries.sort(([leftEmoji, leftCount], [rightEmoji, rightCount]) => {
    const quickOrder = new Map<string, number>(
      QUICK_COMMENT_REACTIONS.map((emoji, index) => [emoji, index])
    );
    const leftQuick = quickOrder.get(leftEmoji);
    const rightQuick = quickOrder.get(rightEmoji);
    if (leftQuick !== undefined && rightQuick !== undefined) return leftQuick - rightQuick;
    if (leftQuick !== undefined) return -1;
    if (rightQuick !== undefined) return 1;
    return rightCount - leftCount || leftEmoji.localeCompare(rightEmoji);
  });
}
