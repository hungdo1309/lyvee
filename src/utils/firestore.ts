/** Firestore rejects `undefined`; omit those fields recursively before writes. */
export function stripUndefined<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry !== undefined) {
      result[key] = stripUndefined(entry);
    }
  }
  return result as T;
}
