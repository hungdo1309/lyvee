/** First name only (ignores middle and last names). */
export function getFirstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? name.trim();
}

/** Last name only (ignores middle names). */
export function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Avatar initials from first + last name.
 * Middle names are ignored, e.g. "John Michael Paul Doe" → "JD".
 */
export function getNameInitials(name: string, fallback = '?'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}
