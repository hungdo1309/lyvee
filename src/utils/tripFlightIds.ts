export function isAutoFlightEntryId(id: string): boolean {
  return /^flight_.+_(depart|arrive)$/.test(id);
}

export function parseAutoFlightEntryId(
  id: string
): { flightKey: string; kind: 'depart' | 'arrive' } | null {
  const match = id.match(/^(flight_.+)_(depart|arrive)$/);
  if (!match) return null;
  return { flightKey: match[1], kind: match[2] as 'depart' | 'arrive' };
}
