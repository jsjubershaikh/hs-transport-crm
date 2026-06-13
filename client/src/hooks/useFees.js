import { useState, useEffect, useCallback } from 'react';
import { feeApi } from '../api/endpoints.js';
import { useRealtime } from './useRealtime.js';

/** Paginated, filtered fee-management list with realtime refetch. */
export function useFees(params = {}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feeApi.list(params);
      setData(res.data || []);
      setMeta(res.meta || null);
      setError(null);
    } catch (e) {
      setError(e.normalizedMessage || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtime(['fee:updated', 'receipt:created'], refetch);

  return { data, meta, loading, error, refetch };
}

/** Fee overview cards (current-month collection, dues, fully paid). */
export function useFeeOverview(params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      setData(await feeApi.overview(params));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtime(['fee:updated'], refetch);

  return { data, loading, refetch };
}
