export const NOTIFICATION_RETENTION_DAYS = 30;
export const POPOVER_NOTIFICATION_LIMIT = 5;
/** Cap live notification sync reads while still covering a full month of activity. */
export const NOTIFICATION_SYNC_LIMIT = 200;
export const NOTIFICATION_RETENTION_NOTE = `Showing notifications from the last ${NOTIFICATION_RETENTION_DAYS} days.`;

export function getNotificationRetentionCutoffIso(
  days = NOTIFICATION_RETENTION_DAYS
): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString();
}
