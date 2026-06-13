import { useEffect, useState } from 'react';
import { getUsersByIds } from '../services/auth';
import { User } from '../types';

const membersCache = new Map<string, User[]>();
const membersInflight = new Map<string, Promise<User[]>>();

/** Stable empty array for optional member-id props. */
export const EMPTY_MEMBER_IDS: string[] = [];

function getMemberKey(memberIds: string[]): string {
  return memberIds.slice().sort().join(',');
}

async function fetchGroupMembers(memberIds: string[]): Promise<User[]> {
  const key = getMemberKey(memberIds);
  const cached = membersCache.get(key);
  if (cached) return cached;

  const inflight = membersInflight.get(key);
  if (inflight) return inflight;

  const request = getUsersByIds(memberIds)
    .then((profiles) => {
      const sorted = profiles.sort((a, b) => a.name.localeCompare(b.name));
      membersCache.set(key, sorted);
      return sorted;
    })
    .finally(() => {
      membersInflight.delete(key);
    });

  membersInflight.set(key, request);
  return request;
}

export function useGroupMembers(memberIds: string[]): {
  members: User[];
  loading: boolean;
} {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const memberKey = getMemberKey(memberIds);

  useEffect(() => {
    if (memberKey.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const cached = membersCache.get(memberKey);
    if (cached) {
      setMembers(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchGroupMembers(memberIds)
      .then((profiles) => {
        if (!cancelled) {
          setMembers(profiles);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [memberKey]);

  return { members, loading };
}
