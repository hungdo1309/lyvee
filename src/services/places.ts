import {
  PlaceSearchBias,
  PlaceSearchResult,
  PlaceSearchScope,
  SearchPlacesOptions,
} from '../types/places';
import { searchAirports } from './airports';

const PHOTON_API = 'https://photon.komoot.io/api/';

const SEARCH_CACHE = new Map<string, PlaceSearchResult[]>();
const GEOCODE_CACHE = new Map<string, PlaceSearchBias>();
const CACHE_LIMIT = 40;
const GEOCODE_CACHE_LIMIT = 30;

const DEFAULT_RADIUS_KM: Record<PlaceSearchScope, number> = {
  region: 250,
  place: 80,
  address: 40,
  airport: 800,
};

function cacheKey(
  provider: string,
  query: string,
  scope: PlaceSearchScope,
  bias?: PlaceSearchBias | null
): string {
  const biasPart = bias
    ? `@${bias.latitude.toFixed(2)},${bias.longitude.toFixed(2)},${bias.radiusKm ?? 'd'}`
    : '';
  return `${provider}:${scope}:v7:${query.trim().toLowerCase()}${biasPart}`;
}

function geocodeCacheKey(label: string): string {
  return label.trim().toLowerCase();
}

function rememberCache(key: string, results: PlaceSearchResult[]): PlaceSearchResult[] {
  if (SEARCH_CACHE.size >= CACHE_LIMIT) {
    const firstKey = SEARCH_CACHE.keys().next().value;
    if (firstKey) SEARCH_CACHE.delete(firstKey);
  }
  SEARCH_CACHE.set(key, results);
  return results;
}

function rememberGeocode(label: string, bias: PlaceSearchBias): PlaceSearchBias {
  const key = geocodeCacheKey(label);
  if (GEOCODE_CACHE.size >= GEOCODE_CACHE_LIMIT) {
    const firstKey = GEOCODE_CACHE.keys().next().value;
    if (firstKey) GEOCODE_CACHE.delete(firstKey);
  }
  GEOCODE_CACHE.set(key, bias);
  return bias;
}

function dedupeSuggestions(items: PlaceSearchResult[]): PlaceSearchResult[] {
  const seen = new Set<string>();
  const results: PlaceSearchResult[] = [];
  for (const item of items) {
    const key = item.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radiusKmForScope(scope: PlaceSearchScope, bias?: PlaceSearchBias | null): number {
  return bias?.radiusKm ?? DEFAULT_RADIUS_KM[scope];
}

function zoomForRadiusKm(radiusKm: number): number {
  const clamped = Math.max(5, Math.min(radiusKm, 500));
  const zoom = Math.round(18 - Math.log2(clamped / 0.25));
  return Math.max(6, Math.min(zoom, 16));
}

function applySearchBias(
  results: PlaceSearchResult[],
  scope: PlaceSearchScope,
  bias?: PlaceSearchBias | null
): PlaceSearchResult[] {
  const limit = 8;
  if (!bias) return results.slice(0, limit);

  const maxKm = radiusKmForScope(scope, bias) * (scope === 'region' ? 1.5 : 4);

  const ranked = results
    .map((item) => {
      const distance =
        item.latitude != null && item.longitude != null
          ? haversineKm(bias.latitude, bias.longitude, item.latitude, item.longitude)
          : Number.POSITIVE_INFINITY;
      return { item, distance };
    })
    .sort((left, right) => left.distance - right.distance);

  if (scope === 'region') {
    const nearby = ranked.filter(({ distance }) => distance <= maxKm).map(({ item }) => item);
    return (nearby.length > 0 ? nearby : ranked.map(({ item }) => item)).slice(0, limit);
  }

  const nearby = ranked.filter(({ distance }) => distance <= maxKm).map(({ item }) => item);
  if (nearby.length >= 3) return nearby.slice(0, limit);
  return ranked.map(({ item }) => item).slice(0, limit);
}

function extractPhotonCoordinates(feature: {
  geometry?: { coordinates?: number[] };
}): { latitude?: number; longitude?: number } {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return {};
  const [longitude, latitude] = coords;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return {};
  return { latitude, longitude };
}

function joinUniqueParts(parts: Array<string | undefined | null>): string[] {
  const result: string[] = [];
  for (const part of parts) {
    const trimmed = part?.trim();
    if (!trimmed) continue;
    if (result.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) continue;
    result.push(trimmed);
  }
  return result;
}

const REGION_PLACE_TYPES = new Set([
  'country',
  'state',
  'region',
  'county',
  'district',
  'city',
  'town',
  'municipality',
  'locality',
]);

const EXCLUDED_REGION_PLACE_TYPES = new Set([
  'house',
  'street',
  'building',
  'postcode',
  'suburb',
  'neighbourhood',
  'neighborhood',
  'quarter',
  'hamlet',
  'isolated_dwelling',
  'allotments',
  'farm',
  'island',
  'archipelago',
]);

const EXCLUDED_REGION_OSM_KEYS = new Set([
  'tourism',
  'amenity',
  'shop',
  'highway',
  'building',
  'natural',
  'leisure',
  'historic',
  'landuse',
  'waterway',
  'railway',
  'aeroway',
]);

function isPhotonRegionFeature(properties: Record<string, string | undefined>): boolean {
  const osmKey = properties.osm_key ?? '';
  const type = (properties.type ?? '').toLowerCase();
  const osmValue = (properties.osm_value ?? '').toLowerCase();

  if (EXCLUDED_REGION_OSM_KEYS.has(osmKey)) return false;
  if (EXCLUDED_REGION_PLACE_TYPES.has(type)) return false;

  if (osmKey === 'place') {
    return REGION_PLACE_TYPES.has(type);
  }

  if (osmKey === 'boundary' && osmValue === 'administrative') {
    return REGION_PLACE_TYPES.has(type) || type === 'administrative';
  }

  return REGION_PLACE_TYPES.has(type);
}

function formatPhotonRegionSuggestion(
  properties: Record<string, string | undefined>,
  coordinates: { latitude?: number; longitude?: number },
  index: number
): PlaceSearchResult | null {
  const name = properties.name?.trim();
  const city = properties.city?.trim();
  const state = properties.state?.trim();
  const country = properties.country?.trim();
  const type = (properties.type ?? '').toLowerCase();
  const osmKey = properties.osm_key ?? '';
  const osmValue = (properties.osm_value ?? '').toLowerCase();

  let label: string | undefined;

  if (type === 'country') {
    label = country ?? name;
  } else if (type === 'state' || type === 'region' || type === 'county' || type === 'district') {
    label = name ?? state;
  } else if (['city', 'town', 'municipality', 'locality'].includes(type)) {
    label = name ?? city;
  } else if (osmKey === 'boundary' && osmValue === 'administrative') {
    label = name ?? state ?? country;
  } else {
    label = city ?? name;
  }

  if (!label) return null;

  const subtitle = joinUniqueParts([state, country])
    .filter((part) => part.toLowerCase() !== label.toLowerCase())
    .join(', ');

  const osmId = properties.osm_id;
  const osmType = properties.osm_type;
  const id = osmId && osmType ? `photon:${osmType}:${osmId}` : `photon:region:${index}:${label}`;

  return {
    id,
    label,
    subtitle: subtitle || undefined,
    placeId: id,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

function formatPhotonSuggestion(
  properties: Record<string, string | undefined>,
  coordinates: { latitude?: number; longitude?: number },
  index: number,
  scope: PlaceSearchScope
): PlaceSearchResult | null {
  const street = properties.street?.trim();
  const housenumber = properties.housenumber?.trim();
  const name = properties.name?.trim();
  const city = properties.city?.trim();
  const state = properties.state?.trim();
  const country = properties.country?.trim();
  const postcode = properties.postcode?.trim();

  const streetLine = [housenumber, street].filter(Boolean).join(' ');
  const title = name || streetLine || city;
  if (!title) return null;

  const addressParts = joinUniqueParts([
    streetLine,
    city,
    state,
    postcode,
    scope === 'address' ? country : null,
  ]);

  let label: string;
  let subtitle: string | undefined;

  if (name) {
    label = name;
    const secondary = addressParts.filter((part) => part.toLowerCase() !== name.toLowerCase());
    subtitle = secondary.length > 0 ? secondary.join(', ') : undefined;
  } else if (streetLine) {
    label = streetLine;
    subtitle = addressParts.slice(1).join(', ') || undefined;
  } else {
    label = city ?? title;
    const secondary = joinUniqueParts([state, postcode, country]).filter(
      (part) => !label.toLowerCase().includes(part.toLowerCase())
    );
    subtitle = secondary.length > 0 ? secondary.join(', ') : undefined;
  }

  const osmId = properties.osm_id;
  const osmType = properties.osm_type;
  const id = osmId && osmType ? `photon:${osmType}:${osmId}` : `photon:${index}:${label}`;

  return {
    id,
    label,
    subtitle,
    placeId: id,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

function appendBiasParams(
  params: URLSearchParams,
  scope: PlaceSearchScope,
  bias?: PlaceSearchBias | null
): void {
  if (!bias) return;

  const radiusKm = radiusKmForScope(scope, bias);
  params.set('lat', String(bias.latitude));
  params.set('lon', String(bias.longitude));
  params.set('zoom', String(zoomForRadiusKm(radiusKm)));
  params.set('location_bias_scale', scope === 'region' ? '0.35' : '0.2');
}

type PhotonFeature = {
  properties?: Record<string, string | undefined>;
  geometry?: { coordinates?: number[] };
};

async function fetchPhotonFeatures(
  query: string,
  scope: PlaceSearchScope,
  bias?: PlaceSearchBias | null,
  signal?: AbortSignal
): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '12',
    lang: 'en',
  });
  if (scope === 'region') {
    for (const layer of ['country', 'state', 'city', 'county', 'district'] as const) {
      params.append('layer', layer);
    }
  }
  appendBiasParams(params, scope, bias);

  const response = await fetch(`${PHOTON_API}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Location search is temporarily unavailable');
  }

  const payload = (await response.json()) as { features?: PhotonFeature[] };
  return payload.features ?? [];
}

async function searchPhotonRegion(
  query: string,
  bias?: PlaceSearchBias | null,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const features = await fetchPhotonFeatures(query, 'region', bias, signal);

  return applySearchBias(
    dedupeSuggestions(
      features
        .filter((feature) => isPhotonRegionFeature(feature.properties ?? {}))
        .map((feature, index) =>
          formatPhotonRegionSuggestion(
            feature.properties ?? {},
            extractPhotonCoordinates(feature),
            index
          )
        )
        .filter((item): item is PlaceSearchResult => item !== null)
    ),
    'region',
    bias
  );
}

async function searchPhotonPlaces(
  query: string,
  scope: PlaceSearchScope,
  bias?: PlaceSearchBias | null,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const features = await fetchPhotonFeatures(query, scope, bias, signal);

  return applySearchBias(
    dedupeSuggestions(
      features
        .map((feature, index) =>
          formatPhotonSuggestion(
            feature.properties ?? {},
            extractPhotonCoordinates(feature),
            index,
            scope
          )
        )
        .filter((item): item is PlaceSearchResult => item !== null)
    ),
    scope,
    bias
  );
}

export function isPlacesSearchConfigured(): boolean {
  return true;
}

export async function geocodePlaceLabel(
  label: string,
  signal?: AbortSignal
): Promise<PlaceSearchBias | null> {
  const trimmed = label.trim();
  if (trimmed.length < 2) return null;

  const cached = GEOCODE_CACHE.get(geocodeCacheKey(trimmed));
  if (cached) return cached;

  const params = new URLSearchParams({
    q: trimmed,
    limit: '1',
    lang: 'en',
  });

  const response = await fetch(`${PHOTON_API}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: number[] } }>;
  };
  const coords = extractPhotonCoordinates(payload.features?.[0] ?? {});
  if (coords.latitude == null || coords.longitude == null) return null;

  return rememberGeocode(trimmed, {
    latitude: coords.latitude,
    longitude: coords.longitude,
  });
}

export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {}
): Promise<PlaceSearchResult[]> {
  const { scope = 'region', bias = null, signal } = options;
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (scope === 'airport') {
    const key = cacheKey('ourairports', trimmed, scope, bias);
    const cached = SEARCH_CACHE.get(key);
    if (cached) return cached;
    return rememberCache(key, await searchAirports(trimmed, bias, signal));
  }

  const provider = scope === 'region' ? 'photon-region' : 'photon-place';
  const key = cacheKey(provider, trimmed, scope, bias);
  const cached = SEARCH_CACHE.get(key);
  if (cached) return cached;

  const results =
    scope === 'region'
      ? await searchPhotonRegion(trimmed, bias, signal)
      : await searchPhotonPlaces(trimmed, scope, bias, signal);

  return rememberCache(key, results);
}

/** Region-level search (countries, cities) for trip destinations and day cities */
export async function searchDestinations(
  query: string,
  options: Omit<SearchPlacesOptions, 'scope'> = {}
): Promise<PlaceSearchResult[]> {
  return searchPlaces(query, { ...options, scope: 'region' });
}
