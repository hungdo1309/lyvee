import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaceSearchBias, PlaceSearchResult } from '../types/places';

/** Open data from https://ourairports.com — updated regularly from official sources. */
const AIRPORTS_CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const COUNTRIES_CSV_URL = 'https://davidmegginson.github.io/ourairports-data/countries.csv';
const STORAGE_KEY = 'lyvee:ourairports:v1';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface AirportRecord {
  id: string;
  iata?: string;
  icao?: string;
  name: string;
  city?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  scheduled: boolean;
  type: string;
}

interface StoredAirportCache {
  updatedAt: number;
  airports: AirportRecord[];
}

let memoryAirports: AirportRecord[] | null = null;
let countryNames: Map<string, string> | null = null;
let airportsLoadPromise: Promise<AirportRecord[]> | null = null;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  result.push(current);
  return result;
}

function parseAirportsCsv(csv: string): AirportRecord[] {
  const lines = csv.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const column = (name: string) => header.indexOf(name);

  const idIndex = column('id');
  const typeIndex = column('type');
  const nameIndex = column('name');
  const latIndex = column('latitude_deg');
  const lonIndex = column('longitude_deg');
  const countryIndex = column('iso_country');
  const cityIndex = column('municipality');
  const scheduledIndex = column('scheduled_service');
  const gpsIndex = column('gps_code');
  const iataIndex = column('iata_code');

  const airports: AirportRecord[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cols = parseCsvLine(lines[lineIndex]);
    const type = cols[typeIndex]?.trim();
    if (type === 'closed') continue;

    const iata = cols[iataIndex]?.trim().toUpperCase();
    const isCommercialType =
      type === 'large_airport' || type === 'medium_airport' || type === 'small_airport';
    if (!iata && !isCommercialType) continue;

    const latitude = Number.parseFloat(cols[latIndex] ?? '');
    const longitude = Number.parseFloat(cols[lonIndex] ?? '');
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const icao = cols[gpsIndex]?.trim().toUpperCase();
    airports.push({
      id: cols[idIndex] ?? String(lineIndex),
      iata: iata || undefined,
      icao: icao || undefined,
      name: cols[nameIndex]?.trim() ?? '',
      city: cols[cityIndex]?.trim() || undefined,
      countryCode: cols[countryIndex]?.trim() ?? '',
      latitude,
      longitude,
      scheduled: cols[scheduledIndex]?.trim() === 'yes',
      type: type ?? '',
    });
  }

  return airports;
}

async function readStoredAirports(): Promise<StoredAirportCache | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAirportCache;
  } catch {
    return null;
  }
}

async function loadCountryNames(signal?: AbortSignal): Promise<Map<string, string>> {
  if (countryNames) return countryNames;

  const response = await fetch(COUNTRIES_CSV_URL, { signal });
  if (!response.ok) return new Map();

  const map = new Map<string, string>();
  const lines = (await response.text()).split('\n').filter((line) => line.trim());
  for (let index = 1; index < lines.length; index++) {
    const cols = parseCsvLine(lines[index]);
    const code = cols[1]?.trim();
    const name = cols[2]?.trim();
    if (code && name) map.set(code, name);
  }

  countryNames = map;
  return map;
}

async function loadAirports(signal?: AbortSignal): Promise<AirportRecord[]> {
  if (memoryAirports) return memoryAirports;
  if (airportsLoadPromise) return airportsLoadPromise;

  airportsLoadPromise = (async () => {
    const stored = await readStoredAirports();
    if (stored && Date.now() - stored.updatedAt < CACHE_MAX_AGE_MS) {
      memoryAirports = stored.airports;
      return memoryAirports;
    }

    try {
      const response = await fetch(AIRPORTS_CSV_URL, { signal });
      if (!response.ok) {
        throw new Error('Airport database is temporarily unavailable');
      }

      const airports = parseAirportsCsv(await response.text());
      memoryAirports = airports;
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ updatedAt: Date.now(), airports } satisfies StoredAirportCache)
      );
      return airports;
    } catch (error) {
      if (stored?.airports.length) {
        memoryAirports = stored.airports;
        return memoryAirports;
      }
      throw error;
    } finally {
      airportsLoadPromise = null;
    }
  })();

  return airportsLoadPromise;
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

function scoreAirport(airport: AirportRecord, query: string, codeUpper: string): number {
  const name = airport.name.toLowerCase();
  const city = airport.city?.toLowerCase() ?? '';
  const q = query.toLowerCase();

  if (airport.iata && airport.iata === codeUpper) return 1000;
  if (airport.icao && airport.icao === codeUpper) return 950;
  if (airport.iata && airport.iata.startsWith(codeUpper) && codeUpper.length >= 2) return 800;
  if (name === q) return 700;
  if (name.startsWith(q)) return 600;
  if (city.startsWith(q)) return 500;
  if (name.includes(q)) return 400;
  if (city.includes(q)) return 300;
  if (airport.iata?.includes(codeUpper) && codeUpper.length >= 2) return 200;

  return 0;
}

function formatAirportResult(
  airport: AirportRecord,
  countries: Map<string, string>
): PlaceSearchResult {
  const country = countries.get(airport.countryCode) ?? airport.countryCode;
  const subtitle = [airport.iata, airport.city, country].filter(Boolean).join(' · ');

  return {
    id: `ourairports:${airport.id}`,
    label: airport.iata ? `${airport.name} (${airport.iata})` : airport.name,
    subtitle: subtitle || undefined,
    placeId: `ourairports:${airport.id}`,
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
}

export async function searchAirports(
  query: string,
  bias?: PlaceSearchBias | null,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [airports, countries] = await Promise.all([
    loadAirports(signal),
    loadCountryNames(signal),
  ]);
  const codeUpper = trimmed.toUpperCase();

  const ranked = airports
    .map((airport) => ({
      airport,
      score: scoreAirport(airport, trimmed, codeUpper),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.airport.scheduled !== right.airport.scheduled) {
        return left.airport.scheduled ? -1 : 1;
      }
      if (bias) {
        const leftDistance = haversineKm(
          bias.latitude,
          bias.longitude,
          left.airport.latitude,
          left.airport.longitude
        );
        const rightDistance = haversineKm(
          bias.latitude,
          bias.longitude,
          right.airport.latitude,
          right.airport.longitude
        );
        return leftDistance - rightDistance;
      }
      return left.airport.name.localeCompare(right.airport.name);
    })
    .slice(0, 8);

  return ranked.map(({ airport }) => formatAirportResult(airport, countries));
}
