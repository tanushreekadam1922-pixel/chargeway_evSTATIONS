import { useEffect, useRef } from 'react';

/** setInterval that always calls the latest callback. Pass delay = null to pause. */
export default function useInterval(callback, delay) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; });
  useEffect(() => {
    if (delay == null) return undefined;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
