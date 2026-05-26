import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppDialog } from '../components/AppDialog';
import { registerDialogAlert } from '../utils/dialog';

export type DialogButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type DialogOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

type DialogRequest = {
  title: string;
  message?: string;
  buttons?: DialogButton[];
  options?: DialogOptions;
};

type DialogContextValue = {
  alert: (
    title: string,
    message?: string,
    buttons?: DialogButton[],
    options?: DialogOptions
  ) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    setQueue((items) => {
      const [, ...rest] = items;
      items[0]?.options?.onDismiss?.();
      return rest;
    });
  }, []);

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: DialogButton[],
      options?: DialogOptions
    ) => {
      setQueue((items) => [...items, { title, message, buttons, options }]);
    },
    []
  );

  useEffect(() => {
    registerDialogAlert(alert);
    return () => registerDialogAlert(null);
  }, [alert]);

  const value = useMemo(() => ({ alert }), [alert]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <AppDialog
        visible={current != null}
        title={current?.title ?? ''}
        message={current?.message}
        buttons={current?.buttons ?? []}
        cancelable={current?.options?.cancelable ?? true}
        onDismiss={dismiss}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}
