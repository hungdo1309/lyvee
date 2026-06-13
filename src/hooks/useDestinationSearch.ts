import { useEffect, useRef, useState } from 'react';
import { DestinationSuggestion } from '../types/places';
import { searchDestinations } from '../services/places';

const SEARCH_DEBOUNCE_MS = 350;

export function useDestinationSearch(query: string) {
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

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
      void searchDestinations(trimmed, { signal: controller.signal })
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
  }, [query]);

  return { suggestions, loading, error };
}
