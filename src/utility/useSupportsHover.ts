import { useEffect, useState } from 'react';

export default function useSupportsHover() {
  const [supportsHover, setSupportsHover] = useState(() => {
    const isClient = typeof window !== 'undefined';
    const hasMatchMedia = isClient && typeof window.matchMedia === 'function';
    if (hasMatchMedia) {
      return window.matchMedia('(hover: hover)').matches;
    }
    return false;
  });

  useEffect(() => {
    const isClient = typeof window !== 'undefined';
    const hasMatchMedia = isClient && typeof window.matchMedia === 'function';
    if (!hasMatchMedia) {
      return;
    }
    const mql = window.matchMedia('(hover: hover)');
    setSupportsHover(mql.matches);

    const listener = (e: MediaQueryListEvent) => {
      setSupportsHover(e.matches);
    };

    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  return supportsHover;
}
