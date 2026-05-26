import { useState, useCallback } from 'react';
import { router, type Href } from 'expo-router';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { enableNotificationsForUser } from '../services/notifications';
import { appAlert } from '../utils/dialog';

export function useFinishOnboarding() {
  const { user } = useAuth();
  const { items, selectGroup, completeOnboarding } = useApp();
  const [finishing, setFinishing] = useState(false);

  const finish = useCallback(
    async (groupId?: string) => {
      if (finishing) return;
      setFinishing(true);
      try {
        if (user) {
          await enableNotificationsForUser(user.id, items);
        }

        if (groupId) {
          await selectGroup(groupId);
        }
        await completeOnboarding();
        router.replace('/(app)/(tabs)/home' as Href);
      } catch (error: unknown) {
        appAlert(
          'Error',
          error instanceof Error ? error.message : 'Could not continue'
        );
        setFinishing(false);
      }
    },
    [completeOnboarding, finishing, items, selectGroup, user]
  );

  return { finish, finishing };
}
