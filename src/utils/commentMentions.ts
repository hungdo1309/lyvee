import { Item, User } from '../types';
import { ItemComment } from '../types/comments';
import { isItemVisibleToMember } from './itemVisibility';
import { excludeActor, uniqueIds } from './pushRecipients';

export interface ActiveMentionQuery {
  startIndex: number;
  query: string;
}

export interface MentionSuggestion {
  key: string;
  kind: 'everyone' | 'member';
  label: string;
  insertToken: string;
}

export type CommentBodyPart =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string };

function normalizeName(name: string): string {
  return name.trim();
}

function buildMemberMentionToken(name: string): string {
  return `@${normalizeName(name)}`;
}

function isMentionBoundary(text: string, matchLength: number): boolean {
  const nextChar = text[matchLength];
  return !nextChar || /\s|[.,!?;:)]/.test(nextChar);
}

function sortedMembersByNameLength(members: User[]): User[] {
  return [...members].sort(
    (left, right) => normalizeName(right.name).length - normalizeName(left.name).length
  );
}

function matchMentionAt(
  body: string,
  atIndex: number,
  members: User[]
): { mentionText: string; length: number; memberId?: string; mentionEveryone?: boolean } | null {
  const charBefore = atIndex > 0 ? body[atIndex - 1] : ' ';
  if (charBefore !== ' ' && charBefore !== '\n' && atIndex !== 0) {
    return null;
  }

  const afterAt = body.slice(atIndex + 1);
  if (
    afterAt.toLowerCase().startsWith('everyone') &&
    isMentionBoundary(afterAt, 'everyone'.length)
  ) {
    return {
      mentionText: '@everyone',
      length: 1 + 'everyone'.length,
      mentionEveryone: true,
    };
  }

  for (const member of sortedMembersByNameLength(members)) {
    const fullName = normalizeName(member.name);
    if (
      fullName.length > 0 &&
      afterAt.toLowerCase().startsWith(fullName.toLowerCase()) &&
      isMentionBoundary(afterAt, fullName.length)
    ) {
      return {
        mentionText: buildMemberMentionToken(fullName),
        length: 1 + fullName.length,
        memberId: member.id,
      };
    }
  }

  return null;
}

export function getMentionAutocompleteMembers(
  members: User[],
  currentUserId: string | undefined
): User[] {
  if (!currentUserId) return [];
  return members.filter((member) => member.id !== currentUserId);
}

export function getActiveMentionQuery(
  body: string,
  cursorIndex: number
): ActiveMentionQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorIndex, body.length));
  const textBeforeCursor = body.slice(0, safeCursor);
  const atIndex = textBeforeCursor.lastIndexOf('@');
  if (atIndex === -1) return null;

  const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
  if (charBefore !== ' ' && charBefore !== '\n' && atIndex !== 0) {
    return null;
  }

  const query = textBeforeCursor.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  return { startIndex: atIndex, query };
}

function getNameParts(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

function memberMatchesMentionQuery(member: User, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  const fullName = normalizeName(member.name).toLowerCase();
  if (fullName.startsWith(normalizedQuery)) return true;
  return getNameParts(member.name).some((part) =>
    part.toLowerCase().startsWith(normalizedQuery)
  );
}

export function getMentionSuggestions(
  members: User[],
  query: string
): MentionSuggestion[] {
  const normalizedQuery = query.toLowerCase();
  const suggestions: MentionSuggestion[] = [];

  if ('everyone'.startsWith(normalizedQuery)) {
    suggestions.push({
      key: 'everyone',
      kind: 'everyone',
      label: 'Everyone',
      insertToken: '@everyone',
    });
  }

  const matchingMembers = members
    .filter((member) => memberMatchesMentionQuery(member, query))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const member of matchingMembers) {
    const fullName = normalizeName(member.name);
    suggestions.push({
      key: member.id,
      kind: 'member',
      label: fullName,
      insertToken: buildMemberMentionToken(fullName),
    });
  }

  return suggestions;
}

export function applyMentionSelection(
  body: string,
  mentionStartIndex: number,
  cursorIndex: number,
  insertToken: string
): { body: string; selectionStart: number } {
  const before = body.slice(0, mentionStartIndex);
  const after = body.slice(cursorIndex);
  const nextBody = `${before}${insertToken} ${after}`;
  return {
    body: nextBody,
    selectionStart: before.length + insertToken.length + 1,
  };
}

export function getMentionableMembers(
  item: Item,
  members: User[],
  currentUserId: string | undefined
): User[] {
  if (!currentUserId) return [];
  return members.filter(
    (member) =>
      member.id !== currentUserId && isItemVisibleToMember(item, member.id)
  );
}

export function sanitizeMentionUserIds(
  mentionUserIds: string[],
  authorId: string
): string[] {
  return uniqueIds(mentionUserIds.filter((id) => id !== authorId));
}

export function getCommentNotificationRecipients(
  item: Item,
  groupMemberIds: string[],
  mentionUserIds: string[],
  mentionEveryone: boolean,
  authorId: string
): string[] {
  const visibleMemberIds = groupMemberIds.filter((memberId) =>
    isItemVisibleToMember(item, memberId)
  );

  const recipients = mentionEveryone
    ? visibleMemberIds
    : mentionUserIds.filter((id) => visibleMemberIds.includes(id));

  return excludeActor(authorId, uniqueIds(recipients));
}

export function getNewMentionRecipients(
  previous: Pick<ItemComment, 'mentionUserIds' | 'mentionEveryone'>,
  next: Pick<ItemComment, 'mentionUserIds' | 'mentionEveryone'>,
  item: Item,
  groupMemberIds: string[],
  authorId: string
): string[] {
  const previousRecipients = new Set(
    getCommentNotificationRecipients(
      item,
      groupMemberIds,
      previous.mentionUserIds,
      previous.mentionEveryone,
      authorId
    )
  );

  return getCommentNotificationRecipients(
    item,
    groupMemberIds,
    next.mentionUserIds,
    next.mentionEveryone,
    authorId
  ).filter((id) => !previousRecipients.has(id));
}

export function parseMentionsFromBody(
  body: string,
  mentionableMembers: User[],
  authorId: string
): { mentionUserIds: string[]; mentionEveryone: boolean } {
  let mentionEveryone = false;
  const mentionUserIds: string[] = [];
  let index = 0;

  while (index < body.length) {
    if (body[index] !== '@') {
      index += 1;
      continue;
    }

    const match = matchMentionAt(body, index, mentionableMembers);
    if (!match) {
      index += 1;
      continue;
    }

    if (match.mentionEveryone) {
      mentionEveryone = true;
    } else if (match.memberId) {
      mentionUserIds.push(match.memberId);
    }

    index += match.length;
  }

  return {
    mentionUserIds: sanitizeMentionUserIds(uniqueIds(mentionUserIds), authorId),
    mentionEveryone,
  };
}

function matchFallbackMentionAt(
  body: string,
  atIndex: number
): { mentionText: string; length: number } | null {
  const charBefore = atIndex > 0 ? body[atIndex - 1] : ' ';
  if (charBefore !== ' ' && charBefore !== '\n' && atIndex !== 0) {
    return null;
  }

  const afterAt = body.slice(atIndex + 1);
  if (!afterAt || /^\s/.test(afterAt)) {
    return null;
  }

  const tokenMatch = afterAt.match(/^[^\s@]+/);
  if (!tokenMatch) {
    return null;
  }

  const token = tokenMatch[0];
  return {
    mentionText: `@${token}`,
    length: 1 + token.length,
  };
}

export function splitCommentBodyParts(body: string, members: User[]): CommentBodyPart[] {
  const parts: CommentBodyPart[] = [];
  let textStart = 0;
  let index = 0;

  while (index < body.length) {
    if (body[index] !== '@') {
      index += 1;
      continue;
    }

    const match =
      matchMentionAt(body, index, members) ?? matchFallbackMentionAt(body, index);
    if (!match) {
      index += 1;
      continue;
    }

    if (index > textStart) {
      parts.push({ type: 'text', value: body.slice(textStart, index) });
    }

    parts.push({ type: 'mention', value: match.mentionText });
    index += match.length;
    textStart = index;
  }

  if (textStart < body.length) {
    parts.push({ type: 'text', value: body.slice(textStart) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: body }];
}

export function splitComposerBodyParts(
  body: string,
  members: User[],
  cursor: number
): CommentBodyPart[] {
  const parts: CommentBodyPart[] = [];
  let textStart = 0;
  let index = 0;
  const activeMention = getActiveMentionQuery(body, cursor);

  while (index < body.length) {
    if (body[index] !== '@') {
      index += 1;
      continue;
    }

    let match:
      | { mentionText: string; length: number }
      | null
      | undefined = matchMentionAt(body, index, members);

    if (
      !match &&
      activeMention &&
      index === activeMention.startIndex &&
      cursor > index
    ) {
      match = {
        mentionText: body.slice(index, cursor),
        length: cursor - index,
      };
    }

    if (!match) {
      match = matchFallbackMentionAt(body, index);
    }

    if (!match) {
      index += 1;
      continue;
    }

    if (index > textStart) {
      parts.push({ type: 'text', value: body.slice(textStart, index) });
    }

    parts.push({ type: 'mention', value: match.mentionText });
    index += match.length;
    textStart = index;
  }

  if (textStart < body.length) {
    parts.push({ type: 'text', value: body.slice(textStart) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: body }];
}

export function chunkRecipientIds(ids: string[], size = 50): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}
