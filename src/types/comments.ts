import { CommentReactionEmoji } from '../constants/commentReactions';

export type CommentReactionCounts = Partial<Record<string, number>>;

export interface ItemComment {
  id: string;
  itemId: string;
  groupId: string;
  parentCommentId: string | null;
  threadRootId: string | null;
  authorId: string;
  body: string;
  mentionUserIds: string[];
  mentionEveryone: boolean;
  reactionCounts?: CommentReactionCounts;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export interface CommentReaction {
  userId: string;
  emoji: CommentReactionEmoji;
  createdAt: string;
}

export type ItemCommentInput = Pick<
  ItemComment,
  'body' | 'mentionUserIds' | 'mentionEveryone' | 'parentCommentId'
>;
