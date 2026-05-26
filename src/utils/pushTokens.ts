import { User } from '../types';

export function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
  );
}

export function collectPushTokensFromUser(user: User): string[] {
  const tokens: string[] = [];
  if (Array.isArray(user.pushTokens)) {
    tokens.push(...user.pushTokens);
  }
  if (typeof user.pushToken === 'string') {
    tokens.push(user.pushToken);
  }
  return [...new Set(tokens.filter(isExpoPushToken))];
}

export function collectPushTokensFromUsers(users: User[]): string[] {
  return [...new Set(users.flatMap(collectPushTokensFromUser))];
}
