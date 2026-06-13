import React, { createContext, useContext } from 'react';

interface AppDrawerContextValue {
  openDrawer: () => void;
  closeDrawer: () => void;
}

const AppDrawerContext = createContext<AppDrawerContextValue | null>(null);

export function AppDrawerProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AppDrawerContextValue;
}) {
  return (
    <AppDrawerContext.Provider value={value}>{children}</AppDrawerContext.Provider>
  );
}

export function useAppDrawer(): AppDrawerContextValue {
  const context = useContext(AppDrawerContext);
  if (!context) {
    throw new Error('useAppDrawer must be used within AppDrawerProvider');
  }
  return context;
}
