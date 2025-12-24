import { useState, useEffect } from 'react';

/**
 * Custom hook to detect media query matches
 * @param {string} query - CSS media query string
 * @returns {boolean} Whether the media query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Legacy browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/**
 * Hook to detect if viewport is mobile size
 * @returns {boolean} True if mobile viewport (< 768px)
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Hook to detect if viewport is tablet size
 * @returns {boolean} True if tablet viewport (768px - 1023px)
 */
export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Hook to detect if viewport is desktop size
 * @returns {boolean} True if desktop viewport (>= 1024px)
 */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

/**
 * Hook to get current breakpoint
 * @returns {'mobile' | 'tablet' | 'desktop'} Current breakpoint name
 */
export function useBreakpoint() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
