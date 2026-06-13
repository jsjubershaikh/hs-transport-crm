import { useState, useEffect, useCallback } from 'react';
import { studentApi } from '../api/endpoints.js';
import { useRealtime } from './useRealtime.js';

/**
 * Fetch a paginated, filtered student list. Re-fetches when params change and
 * when another admin creates/updates/deletes a student (socket events).
 */
export function useStudents(params = {}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const key = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentApi.list(params);
      setData(res.data || []);
      setMeta(res.meta || null);
      setError(null);
    } catch (e) {
      setError(e.normalizedMessage || 'Failed to load students');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtime(['student:created', 'student:updated', 'student:deleted'], refetch);

  return { data, meta, loading, error, refetch };
}
