import { useEffect, useState } from 'react';

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Primary pointer can hover accurately — desktop and iPad + trackpad. */
export function useFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)', true);
}

/** Phone + tablet portrait / small windows. Sheet inspector, taller stage. */
export function useCompactMap(): boolean {
  return useMediaQuery('(max-width: 1023px)', false);
}

export function usePhoneMap(): boolean {
  return useMediaQuery('(max-width: 767px)', false);
}
