import { User as FirebaseUser } from 'firebase/auth';

export interface LinkedAuthProviders {
  hasPassword: boolean;
  hasGoogle: boolean;
  hasApple: boolean;
}

export function getLinkedAuthProviders(fbUser: FirebaseUser | null): LinkedAuthProviders {
  if (!fbUser) {
    return { hasPassword: false, hasGoogle: false, hasApple: false };
  }

  const providerIds = new Set(fbUser.providerData.map((provider) => provider.providerId));
  return {
    hasPassword: providerIds.has('password'),
    hasGoogle: providerIds.has('google.com'),
    hasApple: providerIds.has('apple.com'),
  };
}
