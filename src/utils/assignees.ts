import { Item, User } from '../types';

export function canUserCompleteTask(item: Item, userId: string | undefined): boolean {
  if (!userId || item.type !== 'task') return false;
  return item.assignedTo.includes(userId);
}

export function getAssigneeNames(assignedTo: string[], members: User[]): string[] {
  return assignedTo
    .map((id) => members.find((member) => member.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function formatAssigneeLabel(assignedTo: string[], members: User[]): string | null {
  const names = getAssigneeNames(assignedTo, members);
  if (names.length === 0) return null;

  const firstNames = names.map((name) => name.split(' ')[0]);
  if (firstNames.length <= 2) {
    return firstNames.join(', ');
  }

  return `${firstNames.slice(0, 2).join(', ')} +${firstNames.length - 2}`;
}
