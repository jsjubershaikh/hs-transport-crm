import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

/**
 * Auto-logout after `timeoutMs` of inactivity.
 * Resets the timer on any user interaction event.
 *
 * @param {Function} onLogout  - called when idle timeout fires
 * @param {number}   timeoutMs - idle threshold in ms (default 15 min)
 */
export function useIdleLogout(onLogout, timeoutMs = 15 * 60 * 1000) {
  const timerRef = useRef(null);
  const onLogoutRef = useRef(onLogout);

  // Keep the callback ref fresh without re-registering listeners
  useEffect(() => { onLogoutRef.current = onLogout; }, [onLogout]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onLogoutRef.current(), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Start the timer immediately
    reset();

    // Attach all activity listeners
    IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [reset]);
}
