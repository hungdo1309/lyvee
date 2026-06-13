import { User } from '../types';

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032`´']/g, "'");
}

export function memberMatchesSearchQuery(member: User, query: string): boolean {
  const normalizedQuery = normalizeForSearch(query.trim());
  if (!normalizedQuery) return false;

  const nameParts = member.name.trim().split(/\s+/).filter(Boolean);
  const normalizedName = normalizeForSearch(member.name);
  if (normalizedName.includes(normalizedQuery)) return true;

  if (nameParts.some((part) => normalizeForSearch(part).startsWith(normalizedQuery))) {
    return true;
  }

  return normalizeForSearch(member.email).includes(normalizedQuery);
}

export function searchGroupMembers(
  members: User[],
  query: string,
  excludeIds: string[] = []
): User[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const excluded = new Set(excludeIds);
  return members
    .filter(
      (member) => !excluded.has(member.id) && memberMatchesSearchQuery(member, trimmed)
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}
