import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../api/endpoints.js';
import { useRealtime } from './useRealtime.js';

/**
 * Notification list + live unread count. Used by both the Notifications page
 * and the topbar bell (which only needs unreadCount).
 */
export function useNotifications(params = {}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.list(params);
      setData(res.data || []);
      setMeta(res.meta || null);
      setUnreadCount(res.meta?.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // New notifications arrive in real time.
  useRealtime(['notification:created'], refetch);

  const markRead = useCallback(
    async (id) => {
      await notificationApi.markRead(id);
      refetch();
    },
    [refetch]
  );

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    refetch();
  }, [refetch]);

  return { data, meta, unreadCount, loading, refetch, markRead, markAllRead };
}
