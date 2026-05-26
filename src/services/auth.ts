import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

function mapAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later';
    case 'auth/requires-recent-login':
      return 'Please sign in again with your current password';
    case 'auth/operation-not-allowed':
      return 'This change is not allowed for your account';
    default:
      return error instanceof Error ? error.message : 'Authentication failed';
  }
}

const profileCache = new Map<string, User | null>();
const profileInflight = new Map<string, Promise<User | null>>();
let lastRegisteredPushToken: { userId: string; token: string } | null = null;

function cacheUserProfile(userId: string, user: User | null): User | null {
  profileCache.set(userId, user);
  return user;
}

export function clearUserProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId);
    profileInflight.delete(userId);
    return;
  }
  profileCache.clear();
  profileInflight.clear();
}

export async function ensureUserProfile(fbUser: FirebaseUser): Promise<User> {
  const existing = await getUserProfile(fbUser.uid);
  if (existing) return existing;

  const user: User = {
    id: fbUser.uid,
    name: fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User',
    email: fbUser.email ?? '',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', user.id), user);
  return user;
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const user: User = {
      id: credential.user.uid,
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.id), user);
    return user;
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    return ensureUserProfile(credential.user);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function signOut(): Promise<void> {
  lastRegisteredPushToken = null;
  clearUserProfileCache();
  await firebaseSignOut(auth);
}

async function reauthenticateWithPassword(currentPassword: string): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.email) {
    throw new Error('You must be signed in with email and password');
  }

  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, credential);
}

export async function changeUserEmail(
  newEmail: string,
  currentPassword: string
): Promise<User> {
  try {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Not signed in');

    const trimmed = newEmail.trim();
    if (!trimmed) throw new Error('Email is required');

    await reauthenticateWithPassword(currentPassword);
    await updateEmail(fbUser, trimmed);
    await updateUserProfile(fbUser.uid, { email: trimmed });
    clearUserProfileCache(fbUser.uid);

    const profile = await getUserProfile(fbUser.uid);
    if (!profile) throw new Error('Failed to update profile');
    return profile;
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    if (!auth.currentUser) throw new Error('Not signed in');

    await reauthenticateWithPassword(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
  if (profileCache.has(userId)) {
    return profileCache.get(userId) ?? null;
  }

  const inflight = profileInflight.get(userId);
  if (inflight) return inflight;

  const request = getDoc(doc(db, 'users', userId))
    .then((snapshot) =>
      cacheUserProfile(
        userId,
        snapshot.exists() ? (snapshot.data() as User) : null
      )
    )
    .finally(() => {
      profileInflight.delete(userId);
    });

  profileInflight.set(userId, request);
  return request;
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const unique = [...new Set(userIds)];
  const profiles = await Promise.all(unique.map((id) => getUserProfile(id)));
  return profiles.filter((user): user is User => user !== null);
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'pushToken' | 'pushTokens'>>
): Promise<void> {
  await setDoc(doc(db, 'users', userId), updates, { merge: true });
  if (profileCache.has(userId)) {
    const cached = profileCache.get(userId);
    profileCache.set(userId, cached ? { ...cached, ...updates } : cached ?? null);
  }
}

export async function registerPushToken(userId: string, token: string): Promise<void> {
  if (
    lastRegisteredPushToken?.userId === userId &&
    lastRegisteredPushToken.token === token
  ) {
    return;
  }

  const cached = profileCache.get(userId);
  if (
    cached?.pushToken === token ||
    cached?.pushTokens?.includes(token)
  ) {
    lastRegisteredPushToken = { userId, token };
    return;
  }

  await updateDoc(doc(db, 'users', userId), {
    pushToken: token,
    pushTokens: arrayUnion(token),
  });
  lastRegisteredPushToken = { userId, token };
  if (cached) {
    profileCache.set(userId, {
      ...cached,
      pushToken: token,
      pushTokens: [...new Set([...(cached.pushTokens ?? []), token])],
    });
  }
}

export function subscribeToAuth(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}
