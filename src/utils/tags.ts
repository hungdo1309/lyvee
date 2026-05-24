import { Item } from '../types';

export function normalizeTag(raw: string): string | null {
  const tag = raw.trim().toLowerCase();
  return tag.length > 0 ? tag : null;
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

export function addTag(tags: string[], raw: string): string[] {
  return normalizeTags([...tags, raw]);
}

export function removeTag(tags: string[], tag: string): string[] {
  const normalized = normalizeTag(tag);
  if (!normalized) return tags;
  return tags.filter((t) => t !== normalized);
}

export function parseTagInput(text: string): { tags: string[]; remainder: string } {
  const parts = text.split(',');
  if (parts.length === 1) {
    return { tags: [], remainder: text };
  }
  const tags = parts.slice(0, -1).flatMap((part) => normalizeTags([part]));
  return { tags, remainder: parts[parts.length - 1] ?? '' };
}

export function getItemTags(item: Pick<Item, 'tags'>): string[] {
  return item.tags ?? [];
}

export function collectTagsFromItems(items: Pick<Item, 'tags'>[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    for (const tag of getItemTags(item)) {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push(tag);
      }
    }
  }
  return result.sort();
}

export function itemMatchesTagFilter(
  item: Pick<Item, 'tags'>,
  selectedTags: string[]
): boolean {
  if (selectedTags.length === 0) return true;
  const itemTags = getItemTags(item);
  return selectedTags.some((tag) => itemTags.includes(tag));
}

export function formatTagLabel(tag: string): string {
  if (!tag) return tag;
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

const TAG_PALETTE = [
  { bg: '#F3F4F6', text: '#4B5563' },
  { bg: '#EFF6FF', text: '#2563EB' },
  { bg: '#F5F3FF', text: '#7C3AED' },
  { bg: '#ECFDF5', text: '#059669' },
  { bg: '#FFF7ED', text: '#D97706' },
  { bg: '#FDF2F8', text: '#DB2777' },
];

export function getTagStyle(tag: string): { backgroundColor: string; color: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
  return { backgroundColor: palette.bg, color: palette.text };
}
