import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Group } from '../types';
import { normalizeGroup } from '../utils/groupRoles';

/** Firestore read for a single group — kept separate to avoid service import cycles. */
export async function getGroup(groupId: string): Promise<Group | null> {
  const snapshot = await getDoc(doc(db, 'groups', groupId));
  if (!snapshot.exists()) return null;
  return normalizeGroup({ ...(snapshot.data() as Group), id: snapshot.id });
}
