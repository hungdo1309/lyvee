import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signIn,
  signUp,
  signOut,
  subscribeToAuth,
  ensureUserProfile,
  registerPushToken,
  changeUserEmail,
  changeUserPassword,
} from '../services/auth';
import { clearActiveGroupSession } from '../services/session';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await ensureUserProfile(fbUser);
        setUser(profile);
        try {
          const { ensureNotificationPermissions, registerForPushNotifications } =
            await import('../services/notifications');
          await ensureNotificationPermissions();
          const token = await registerForPushNotifications();
          if (token && profile) {
            await registerPushToken(fbUser.uid, token);
          }
        } catch {
          // Push tokens aren't available in Expo Go without an EAS project.
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await signIn(email, password);
    await clearActiveGroupSession(profile.id);
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const profile = await signUp(email, password, name);
      await clearActiveGroupSession(profile.id);
      setUser(profile);
      return profile;
    },
    []
  );

  const changeEmail = useCallback(async (newEmail: string, currentPassword: string) => {
    const profile = await changeUserEmail(newEmail, currentPassword);
    setUser(profile);
    return profile;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changeUserPassword(currentPassword, newPassword);
    },
    []
  );

  const logout = useCallback(async () => {
    const userId = user?.id;
    await signOut();
    if (userId) await clearActiveGroupSession(userId);
    setUser(null);
    setFirebaseUser(null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, login, register, changeEmail, changePassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
