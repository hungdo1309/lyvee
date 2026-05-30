import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Group } from '../types';

export async function fetchGroupMemberIds(groupId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return [];
  return (snap.data() as Group).members ?? [];
}
