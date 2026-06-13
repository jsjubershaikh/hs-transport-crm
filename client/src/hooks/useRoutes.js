import { useState, useEffect, useCallback } from 'react';
import { routeApi } from '../api/endpoints.js';
import { useRealtime } from './useRealtime.js';

/**
 * Route list with computed studentCount + totalMonthlyCollection.
 * Re-fetches on route/student socket events so cards stay live.
 */
export function useRoutes(params = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setData((await routeApi.list(params)) || []);
      setError(null);
    } catch (e) {
      setError(e.normalizedMessage || 'Failed to load routes');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtime(['route:updated', 'student:created', 'student:deleted'], refetch);

  return { data, loading, error, refetch };
}
