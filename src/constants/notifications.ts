export const NOTIFICATION_RETENTION_DAYS = 30;
export const POPOVER_NOTIFICATION_LIMIT = 5;
/** Live listener cap for bell badge and recent activity. */
export const NOTIFICATION_LIVE_SYNC_LIMIT = 50;
/** Page size for loading older notifications on the full screen. */
export const NOTIFICATION_PAGE_SIZE = 50;
/** Max docs scanned when matching a push without a notificationId. */
export const NOTIFICATION_HISTORY_SCAN_LIMIT = 50;
/** @deprecated Use NOTIFICATION_LIVE_SYNC_LIMIT */
export const NOTIFICATION_SYNC_LIMIT = NOTIFICATION_LIVE_SYNC_LIMIT;
export const NOTIFICATION_RETENTION_NOTE = `Showing notifications from the last ${NOTIFICATION_RETENTION_DAYS} days`;

export function getNotificationRetentionCutoffIso(
  days = NOTIFICATION_RETENTION_DAYS
): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString();
}
