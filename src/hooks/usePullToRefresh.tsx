import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

/**
 * Pull-to-Refresh Hook
 * Implements mobile-style pull-to-refresh gesture for touch devices.
 * Triggers callback when user pulls down past threshold.
 * 
 * @param options - Configuration options
 * @param options.onRefresh - Async function to call when refresh is triggered
 * @param options.threshold - Pull distance required to trigger refresh in pixels (default: 80)
 * @param options.maxPull - Maximum pull distance in pixels (default: 120)
 * @returns Ref and state for implementing pull-to-refresh UI
 * 
 * @example
 * ```tsx
 * const { 
 *   containerRef, 
 *   pullDistance, 
 *   isRefreshing 
 * } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await refetch();
 *   },
 *   threshold: 100
 * });
 * 
 * return (
 *   <div ref={containerRef}>
 *     {pullDistance > 0 && (
 *       <div style={{ height: pullDistance }}>
 *         {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
 *       </div>
 *     )}
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.5, maxPull);
      setPullDistance(distance);
    }
  }, [isPulling, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    shouldTrigger,
  };
}
