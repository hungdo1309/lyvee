import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toOccurrenceKey } from '../utils/recurrence';

function buildLockId(itemId: string, occurrenceDate: string): string {
  const occurrence = toOccurrenceKey(occurrenceDate);
  return `${itemId}_${occurrence}`;
}

/**
 * Claims a one-time lock so only one client sends overdue push for an occurrence.
 * Returns true when this client created the lock.
 */
export async function tryClaimOverdueNotificationLock(
  itemId: string,
  occurrenceDate: string,
  groupId: string,
  claimedByUserId: string
): Promise<boolean> {
  const lockId = buildLockId(itemId, occurrenceDate);
  const occurrence = toOccurrenceKey(occurrenceDate);

  try {
    await setDoc(doc(db, 'overdueNotificationLocks', lockId), {
      itemId,
      occurrence,
      groupId,
      claimedBy: claimedByUserId,
      claimedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
