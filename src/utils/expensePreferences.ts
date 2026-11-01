import AsyncStorage from '@react-native-async-storage/async-storage';

const simplifyDebtsMemory = new Map<string, boolean>();
const simplifyDebtsKey = (expenseGroupId: string) =>
  `@lyvee/expenses/simplifyDebts:${expenseGroupId}`;

export function getCachedSimplifyDebts(expenseGroupId: string): boolean | null {
  return simplifyDebtsMemory.has(expenseGroupId)
    ? (simplifyDebtsMemory.get(expenseGroupId) ?? false)
    : null;
}

export async function loadSimplifyDebts(expenseGroupId: string): Promise<boolean> {
  const cached = getCachedSimplifyDebts(expenseGroupId);
  if (cached != null) return cached;

  const raw = await AsyncStorage.getItem(simplifyDebtsKey(expenseGroupId));
  const value = raw === '1';
  simplifyDebtsMemory.set(expenseGroupId, value);
  return value;
}

export async function saveSimplifyDebts(
  expenseGroupId: string,
  value: boolean
): Promise<void> {
  simplifyDebtsMemory.set(expenseGroupId, value);
  await AsyncStorage.setItem(simplifyDebtsKey(expenseGroupId), value ? '1' : '0');
}
