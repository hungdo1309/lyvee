import * as Location from 'expo-location';
import { PlaceSearchBias } from '../types/places';

export type LocationPermissionState = 'granted' | 'denied' | 'undetermined';

let cachedDeviceBias: PlaceSearchBias | null = null;
let pendingDeviceBias: Promise<PlaceSearchBias | null> | null = null;

function isLocationPermissionGranted(status: Location.PermissionStatus): boolean {
  return status === Location.PermissionStatus.GRANTED;
}

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (isLocationPermissionGranted(permission.status)) return 'granted';
    if (permission.status === Location.PermissionStatus.DENIED) return 'denied';
    return 'undetermined';
  } catch {
    return 'denied';
  }
}

export async function hasLocationPermissions(): Promise<boolean> {
  return (await getLocationPermissionState()) === 'granted';
}

export async function hasLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (isLocationPermissionGranted(existing.status)) {
      return true;
    }

    if (
      existing.status === Location.PermissionStatus.DENIED &&
      existing.canAskAgain === false
    ) {
      return false;
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    return isLocationPermissionGranted(requested.status);
  } catch {
    return false;
  }
}

/** Checks OS location services and requests foreground permission when needed. */
export async function ensureLocationForPlaceSearch(): Promise<boolean> {
  if (!(await hasLocationServicesEnabled())) {
    return false;
  }
  if (await hasLocationPermissions()) {
    return true;
  }
  return requestLocationPermissions();
}

export async function getDevicePlaceSearchBias(): Promise<PlaceSearchBias | null> {
  if (cachedDeviceBias) return cachedDeviceBias;
  if (pendingDeviceBias) return pendingDeviceBias;

  pendingDeviceBias = (async () => {
    try {
      const ready = await ensureLocationForPlaceSearch();
      if (!ready) return null;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      cachedDeviceBias = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radiusKm: 50,
      };
      return cachedDeviceBias;
    } catch {
      return null;
    } finally {
      pendingDeviceBias = null;
    }
  })();

  return pendingDeviceBias;
}
