import { useCallback, useEffect, useRef, useState } from 'react';
import useInterval from './useInterval.js';

/**
 * Loads data from the API and keeps it fresh.
 *   const { data, error, loading, reload } = useLoader(() => userApi.dashboard(), { pollMs: 15000 });
 * - deps:    re-fetch when any of these change
 * - pollMs:  refetch every N ms (null = no polling)
 * - enabled: false = do not fetch yet
 */
export default function useLoader(fetcher, { deps = [], pollMs = null, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const fetcherRef = useRef(fetcher);
  const alive = useRef(true);

  useEffect(() => { fetcherRef.current = fetcher; });
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await fetcherRef.current();
      if (alive.current) setState({ data, error: '', loading: false });
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, ...deps]);

  useInterval(reload, enabled ? pollMs : null);

  return { ...state, reload };
}
