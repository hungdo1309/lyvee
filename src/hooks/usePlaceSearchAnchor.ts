import { useEffect, useState } from 'react';
import { geocodePlaceLabel } from '../services/places';
import { getDevicePlaceSearchBias } from '../services/location';
import { PlaceSearchAnchor, PlaceSearchBias, placeSearchAnchorLabel } from '../types/places';

export function usePlaceSearchAnchor(
  near?: PlaceSearchAnchor,
  allowDeviceFallback = false
): PlaceSearchBias | null {
  const [bias, setBias] = useState<PlaceSearchBias | null>(null);
  const nearLabel = placeSearchAnchorLabel(near);

  useEffect(() => {
    let cancelled = false;

    async function resolveBias() {
      if (nearLabel) {
        const anchorBias = await geocodePlaceLabel(nearLabel);
        if (!cancelled && anchorBias) {
          setBias(anchorBias);
          return;
        }
      }

      if (!allowDeviceFallback) {
        if (!cancelled) setBias(null);
        return;
      }

      const deviceBias = await getDevicePlaceSearchBias();
      if (!cancelled) {
        setBias(deviceBias);
      }
    }

    void resolveBias();
    return () => {
      cancelled = true;
    };
  }, [nearLabel, allowDeviceFallback]);

  return bias;
}
