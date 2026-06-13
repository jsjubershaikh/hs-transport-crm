import { useEffect, useRef } from 'react';
import { getSocket } from '../api/socket.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Subscribe to one or more socket events. The handler is called with
 * (payload, eventName) whenever any listed event fires. Re-binds when auth
 * changes (so the socket is guaranteed to exist after login / auto-login).
 *
 *   useRealtime(['fee:updated', 'receipt:created'], () => refetch())
 */
export function useRealtime(events, handler) {
  const savedHandler = useRef(handler);
  const { token } = useAuth();

  useEffect(() => {
    savedHandler.current = handler;
  });

  const key = Array.isArray(events) ? events.join(',') : events;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const list = Array.isArray(events) ? events : [events];
    const handlers = list.map((ev) => {
      const fn = (payload) => savedHandler.current?.(payload, ev);
      socket.on(ev, fn);
      return [ev, fn];
    });
    return () => handlers.forEach(([ev, fn]) => socket.off(ev, fn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token]);
}
