import { Trip } from '../types/trips';
import { ExpenseGroup } from '../types/expenses';

function uniqueMemberIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function membersMatch(left: string[], right: string[]): boolean {
  const a = uniqueMemberIds(left).sort();
  const b = uniqueMemberIds(right).sort();
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function getDefaultGroupExpenseGroup(
  expenseGroups: ExpenseGroup[]
): ExpenseGroup | null {
  return expenseGroups.find((entry) => entry.isDefault === true) ?? null;
}

export function getTripExpenseGroups(
  expenseGroups: ExpenseGroup[],
  trips: Trip[]
): ExpenseGroup[] {
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  return expenseGroups
    .filter((entry) => Boolean(entry.tripId))
    .sort((left, right) => {
      const leftTrip = left.tripId ? tripById.get(left.tripId) : undefined;
      const rightTrip = right.tripId ? tripById.get(right.tripId) : undefined;
      const leftSort = leftTrip?.updatedAt ?? left.updatedAt;
      const rightSort = rightTrip?.updatedAt ?? right.updatedAt;
      return rightSort.localeCompare(leftSort);
    });
}

export function getTripTitleForExpenseGroup(
  expenseGroup: ExpenseGroup,
  trips: Trip[]
): string {
  if (!expenseGroup.tripId) return expenseGroup.name;
  const trip = trips.find((entry) => entry.id === expenseGroup.tripId);
  return trip?.destination ?? expenseGroup.name;
}
