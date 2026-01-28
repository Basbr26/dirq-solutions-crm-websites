import { useState, useEffect } from 'react';

/**
 * Reactive media query hook
 * Tracks whether a CSS media query matches the current viewport.
 * 
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns Boolean indicating if the media query currently matches
 * 
 * @example
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * 
 * return <div>{isMobile ? <MobileNav /> : <DesktopNav />}</div>;
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Create event listener
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Add listener
    media.addEventListener('change', listener);
    
    // Cleanup
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
