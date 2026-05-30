import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  linkWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  type AuthCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { configureGoogleSignIn } from '../config/googleSignIn';
import {
  getGoogleSignInModule,
  GOOGLE_SIGNIN_UNAVAILABLE_MESSAGE,
} from '../utils/googleSignInNative';
import { User } from '../types';

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Sign in cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

export class GoogleAccountLinkError extends Error {
  email: string;

  constructor(email: string) {
    super('An account with this email already exists. Sign in with your password to link Google.');
    this.name = 'GoogleAccountLinkError';
    this.email = email;
  }
}

let pendingGoogleCredential: AuthCredential | null = null;

function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: string }).code);
  }
  return '';
}

function mapAuthError(error: unknown): string {
  const code = getAuthErrorCode(error);

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
    case 'auth/provider-already-linked':
      return 'Google is already linked to this account';
    case 'auth/credential-already-in-use':
      return 'This Google account is already linked to another user';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists with a different sign-in method';
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
  const normalizedEmail = email.trim();

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
    return ensureUserProfile(credential.user);
  } catch (error) {
    const code = getAuthErrorCode(error);
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      throw new Error(await getPasswordSignInHelpMessage(normalizedEmail));
    }
    throw new Error(mapAuthError(error));
  }
}

async function getPasswordSignInHelpMessage(email: string): Promise<string> {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);

    if (methods.includes('google.com') && !methods.includes('password')) {
      return 'This account uses Google Sign-In only. Tap "Sign in with Google", then add a password in Settings if you want both options.';
    }

    if (methods.includes('google.com') && methods.includes('password')) {
      return 'Incorrect password. You can also sign in with Google — both are linked to this account.';
    }
  } catch {
    // Email enumeration protection may hide methods; fall back below.
  }

  return 'Incorrect email or password. If you previously signed in with Google, use Sign in with Google instead.';
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
    if (methods.includes('google.com') && !methods.includes('password')) {
      throw new Error(
        'This account uses Google Sign-In only. Sign in with Google instead, or add a password in Settings after signing in.'
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Google Sign-In')) {
      throw error;
    }
  }

  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

async function getGoogleSignInPayload(): Promise<{
  credential: AuthCredential;
  email: string;
}> {
  const googleSignIn = getGoogleSignInModule();
  if (!googleSignIn) {
    throw new Error(GOOGLE_SIGNIN_UNAVAILABLE_MESSAGE);
  }

  configureGoogleSignIn();
  const { GoogleSignin } = googleSignIn;

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') {
    throw new GoogleSignInCancelledError();
  }

  const idToken = response.data.idToken;
  const email = response.data.user.email?.trim();
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token');
  }
  if (!email) {
    throw new Error('Google sign-in did not return an email address');
  }

  return {
    credential: GoogleAuthProvider.credential(idToken),
    email,
  };
}

async function getExistingSignInMethods(email: string): Promise<string[]> {
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch {
    return [];
  }
}

function accountHasPasswordWithoutGoogle(methods: string[]): boolean {
  return methods.includes('password') && !methods.includes('google.com');
}

export async function signInWithGoogle(): Promise<User> {
  const { credential, email } = await getGoogleSignInPayload();
  const existingMethods = await getExistingSignInMethods(email);

  // Never sign in with Google alone when a password account already exists for
  // this email — that can create a separate account or drop password access.
  if (accountHasPasswordWithoutGoogle(existingMethods)) {
    pendingGoogleCredential = credential;
    throw new GoogleAccountLinkError(email);
  }

  try {
    const result = await signInWithCredential(auth, credential);
    pendingGoogleCredential = null;
    await result.user.reload();
    return ensureUserProfile(result.user);
  } catch (error) {
    if (getAuthErrorCode(error) === 'auth/account-exists-with-different-credential') {
      pendingGoogleCredential = credential;
      throw new GoogleAccountLinkError(email);
    }

    if (getAuthErrorCode(error) === 'auth/email-already-in-use') {
      pendingGoogleCredential = credential;
      throw new GoogleAccountLinkError(email);
    }

    throw new Error(mapAuthError(error));
  }
}

export async function linkGoogleWithPassword(
  email: string,
  password: string
): Promise<User> {
  if (!pendingGoogleCredential) {
    throw new Error('No pending Google sign-in. Try signing in with Google again.');
  }

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    await linkWithCredential(credential.user, pendingGoogleCredential);
    pendingGoogleCredential = null;
    clearUserProfileCache(credential.user.uid);
    return ensureUserProfile(credential.user);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export function clearPendingGoogleCredential(): void {
  pendingGoogleCredential = null;
}

export async function linkGoogleAccount(): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('Not signed in');

  try {
    const { credential, email } = await getGoogleSignInPayload();
    const existingMethods = await getExistingSignInMethods(email);

    if (
      accountHasPasswordWithoutGoogle(existingMethods) &&
      fbUser.email?.toLowerCase() !== email.toLowerCase()
    ) {
      throw new Error(
        'This Google account matches a different email/password login. Sign out, sign in with email and password, then link Google from Settings.'
      );
    }

    await linkWithCredential(fbUser, credential);
    await fbUser.reload();
  } catch (error) {
    if (error instanceof GoogleSignInCancelledError) {
      throw error;
    }
    throw new Error(mapAuthError(error));
  }
}

export async function addPasswordToAccount(
  email: string,
  password: string
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('Not signed in');

  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error('Email is required');

  try {
    const credential = EmailAuthProvider.credential(normalizedEmail, password);
    await linkWithCredential(fbUser, credential);
    await fbUser.reload();
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function signOut(): Promise<void> {
  lastRegisteredPushToken = null;
  clearUserProfileCache();
  pendingGoogleCredential = null;
  try {
    configureGoogleSignIn();
    const googleSignIn = getGoogleSignInModule();
    if (googleSignIn) {
      await googleSignIn.GoogleSignin.signOut();
    }
  } catch {
    // Google Sign-In may not be configured in dev.
  }
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
