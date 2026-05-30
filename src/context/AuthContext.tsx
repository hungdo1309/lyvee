import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  signIn,
  signUp,
  signOut,
  subscribeToAuth,
  ensureUserProfile,
  registerPushToken,
  changeUserEmail,
  changeUserPassword,
  signInWithGoogle,
  linkGoogleWithPassword,
  linkGoogleAccount,
  addPasswordToAccount,
  clearPendingGoogleCredential,
  GoogleSignInCancelledError,
  GoogleAccountLinkError,
} from '../services/auth';
import { clearActiveGroupSession } from '../services/session';
import { getLinkedAuthProviders, type LinkedAuthProviders } from '../utils/authProviders';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  linkedProviders: LinkedAuthProviders;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  linkGoogleWithPassword: (email: string, password: string) => Promise<User>;
  linkGoogle: () => Promise<void>;
  setPassword: (email: string, password: string) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export { GoogleSignInCancelledError, GoogleAccountLinkError };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authRefreshKey, setAuthRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const linkedProviders = useMemo(
    () => getLinkedAuthProviders(firebaseUser ?? auth.currentUser),
    [firebaseUser, authRefreshKey]
  );

  const refreshLinkedProviders = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser(auth.currentUser);
      setAuthRefreshKey((key) => key + 1);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await ensureUserProfile(fbUser);
        setUser(profile);
        try {
          const { hasNotificationPermissions, registerForPushNotifications } =
            await import('../services/notifications');
          if (await hasNotificationPermissions()) {
            const token = await registerForPushNotifications();
            if (token && profile) {
              await registerPushToken(fbUser.uid, token);
            }
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

  const loginWithGoogle = useCallback(async () => {
    const profile = await signInWithGoogle();
    await clearActiveGroupSession(profile.id);
    setUser(profile);
    return profile;
  }, []);

  const linkGoogleWithPasswordHandler = useCallback(
    async (email: string, password: string) => {
      const profile = await linkGoogleWithPassword(email, password);
      await clearActiveGroupSession(profile.id);
      setUser(profile);
      return profile;
    },
    []
  );

  const linkGoogle = useCallback(async () => {
    await linkGoogleAccount();
    await refreshLinkedProviders();
  }, [refreshLinkedProviders]);

  const setPassword = useCallback(async (email: string, password: string) => {
    await addPasswordToAccount(email, password);
    await refreshLinkedProviders();
  }, [refreshLinkedProviders]);

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
    clearPendingGoogleCredential();
    await signOut();
    if (userId) await clearActiveGroupSession(userId);
    setUser(null);
    setFirebaseUser(null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        linkedProviders,
        loading,
        login,
        register,
        loginWithGoogle,
        linkGoogleWithPassword: linkGoogleWithPasswordHandler,
        linkGoogle,
        setPassword,
        changeEmail,
        changePassword,
        logout,
      }}
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
