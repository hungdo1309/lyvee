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
  | 'item.comment.mention'
  | 'item.comment.reply';

export interface PushNotificationData {
  type: PushNotificationType;
  groupId?: string;
  itemId?: string;
  commentId?: string;
  occurrence?: string;
}

export interface PushEventInput {
  type: PushNotificationType;
  actorId: string;
  recipientIds: string[];
  title: string;
  body: string;
  actorName?: string;
  data?: PushNotificationData;
}
