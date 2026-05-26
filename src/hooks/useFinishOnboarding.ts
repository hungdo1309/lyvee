import { useState, useCallback } from 'react';
import { router, type Href } from 'expo-router';
import { useApp } from '../context/AppContext';
import { appAlert } from '../utils/dialog';

export function useFinishOnboarding() {
  const { selectGroup, completeOnboarding } = useApp();
  const [finishing, setFinishing] = useState(false);

  const finish = useCallback(
    async (groupId: string) => {
      if (!groupId || finishing) return;
      setFinishing(true);
      try {
        await selectGroup(groupId);
        await completeOnboarding();
        router.replace('/(app)/(tabs)' as Href);
      } catch (error: unknown) {
        appAlert(
          'Error',
          error instanceof Error ? error.message : 'Could not continue'
        );
        setFinishing(false);
      }
    },
    [completeOnboarding, finishing, selectGroup]
  );

  return { finish, finishing };
}
