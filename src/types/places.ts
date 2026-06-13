export type TripLocationSource = 'search' | 'manual';

export type PlaceSearchScope = 'region' | 'place' | 'address' | 'airport';

export interface TripLocation {
  label: string;
  detail?: string;
  placeId?: string;
  source: TripLocationSource;
}

/** Search result row before converting to TripLocation */
export interface PlaceSearchResult {
  id: string;
  label: string;
  subtitle?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

/** Geographic center used to bias place search results */
export interface PlaceSearchBias {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export type PlaceSearchAnchor = TripLocation | string | null | undefined;

export interface SearchPlacesOptions {
  scope?: PlaceSearchScope;
  bias?: PlaceSearchBias | null;
  signal?: AbortSignal;
}

/** @deprecated Use TripLocation — kept for gradual migration */
export type DestinationSuggestion = PlaceSearchResult;

export function tripLocationFromSearch(result: PlaceSearchResult): TripLocation {
  return {
    label: result.label,
    detail: result.subtitle,
    placeId: result.placeId ?? result.id,
    source: 'search',
  };
}

export function tripLocationFromManual(label: string, detail?: string): TripLocation {
  const trimmed = label.trim();
  return {
    label: trimmed,
    detail: detail?.trim() || undefined,
    source: 'manual',
  };
}

export function placeSearchAnchorLabel(anchor: PlaceSearchAnchor): string | null {
  if (!anchor) return null;
  if (typeof anchor === 'string') {
    const trimmed = anchor.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const trimmed = anchor.label.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function tripLocationLabel(location: TripLocation | undefined | null): string {
  if (!location) return '';
  return location.detail ? `${location.label} · ${location.detail}` : location.label;
}

/** City from an airport TripLocation (detail is "IATA · City · Country" from airport search). */
export function getAirportCityFromTripLocation(location: TripLocation): string | undefined {
  const detail = location.detail?.trim();
  if (!detail) return undefined;

  const parts = detail.split(' · ').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return parts[1];
  }
  if (parts.length === 2) {
    if (/^[A-Z0-9]{2,4}$/i.test(parts[0])) {
      return parts[1];
    }
    return parts[0];
  }
  return undefined;
}
