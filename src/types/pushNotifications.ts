export type PushNotificationType =
  | 'group.member_joined'
  | 'group.member_left'
  | 'group.member_removed'
  | 'group.role_promoted'
  | 'group.role_demoted'
  | 'group.ownership_transferred'
  | 'group.renamed'
  | 'group.deleted'
  | 'item.created'
  | 'item.updated'
  | 'item.deleted'
  | 'item.completed'
  | 'item.overdue'
  | 'item.comment.mention'
  | 'item.comment.reply'
  | 'item.comment.reaction'
  | 'expense.created'
  | 'expense.updated'
  | 'expense.deleted'
  | 'expense.settlement.added'
  | 'expense.settlement.removed'
  | 'expense.group.created'
  | 'expense.group.deleted';

export interface PushNotificationData {
  type?: PushNotificationType | string;
  groupId?: string;
  itemId?: string;
  tripId?: string;
  expenseGroupId?: string;
  expenseId?: string;
  settlementId?: string;
  dateKey?: string;
  entryId?: string;
  commentId?: string;
  occurrence?: string;
  reaction?: string;
  notificationId?: string;
}

export interface PushEventInput {
  type: PushNotificationType;
  actorId: string;
  recipientIds: string[];
  title: string;
  body: string;
  actorName?: string;
  /** When true, the actor is not removed from recipientIds (e.g. overdue alerts). */
  includeActor?: boolean;
  data?: PushNotificationData;
}
