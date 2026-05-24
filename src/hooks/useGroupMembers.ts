import { useEffect, useState } from 'react';
import { getUsersByIds } from '../services/auth';
import { User } from '../types';

export function useGroupMembers(memberIds: string[]): {
  members: User[];
  loading: boolean;
} {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const memberKey = memberIds.slice().sort().join(',');

  useEffect(() => {
    if (memberIds.length === 0) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getUsersByIds(memberIds)
      .then((profiles) => {
        if (!cancelled) {
          setMembers(profiles.sort((a, b) => a.name.localeCompare(b.name)));
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
