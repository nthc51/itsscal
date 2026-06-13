import { useEffect, useState } from 'react';

/**
 * Only returns true (show skeleton) after `delayMs` have passed.
 * If data loads faster than the delay, the skeleton is never shown — zero flicker.
 */
export function useDelayedLoading(loading: boolean, delayMs = 350): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return show;
}
