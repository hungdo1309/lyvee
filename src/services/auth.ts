import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
    default:
      return error instanceof Error ? error.message : 'Authentication failed';
  }
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
  await firebaseSignOut(auth);
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, 'users', userId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as User;
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const unique = [...new Set(userIds)];
  const profiles = await Promise.all(unique.map((id) => getUserProfile(id)));
  return profiles.filter((user): user is User => user !== null);
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'pushToken'>>
): Promise<void> {
  await setDoc(doc(db, 'users', userId), updates, { merge: true });
}

export function subscribeToAuth(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}
