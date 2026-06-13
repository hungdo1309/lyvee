import { useEffect, useRef, useState } from 'react';
import { PlaceSearchAnchor, PlaceSearchResult, PlaceSearchScope } from '../types/places';
import { searchPlaces } from '../services/places';
import { usePlaceSearchAnchor } from './usePlaceSearchAnchor';

const SEARCH_DEBOUNCE_MS = 350;

export function useLocationSearch(
  query: string,
  scope: PlaceSearchScope = 'region',
  near?: PlaceSearchAnchor,
  allowDeviceFallback = false
) {
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const bias = usePlaceSearchAnchor(near, allowDeviceFallback);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      void searchPlaces(trimmed, { scope, bias, signal: controller.signal })
        .then((results) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(results);
          setError(null);
        })
        .catch((err) => {
          if (requestIdRef.current !== requestId) return;
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setError(err instanceof Error ? err.message : 'Search failed');
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, scope, bias]);

  return { suggestions, loading, error };
}
