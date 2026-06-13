import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number from 0 to `target` on mount / when target changes.
 * Uses requestAnimationFrame with an ease-out curve.
 */
export function useCountUp(target = 0, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const to = Number(target) || 0;
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
