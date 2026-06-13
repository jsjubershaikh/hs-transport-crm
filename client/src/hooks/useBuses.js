import { useState, useEffect, useCallback } from 'react';
import { busApi } from '../api/endpoints.js';
import { useRealtime } from './useRealtime.js';

/** Bus list with computed occupancy; live on bus/student events. */
export function useBuses() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setData((await busApi.list()) || []);
      setError(null);
    } catch (e) {
      setError(e.normalizedMessage || 'Failed to load buses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtime(['bus:updated', 'student:created', 'student:deleted'], refetch);

  return { data, loading, error, refetch };
}
