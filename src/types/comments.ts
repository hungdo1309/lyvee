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
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export type ItemCommentInput = Pick<
  ItemComment,
  'body' | 'mentionUserIds' | 'mentionEveryone' | 'parentCommentId'
>;
