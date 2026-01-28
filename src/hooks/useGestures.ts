import { useCallback } from 'react';

// Touch gesture detection
export interface GestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isMoving: boolean;
}

/**
 * Touch Gestures Hook
 * Provides swipe gesture detection for mobile interfaces.
 * Detects left, right, and down swipes with 75px threshold.
 * 
 * @returns Object with gesture handler factories
 * @returns handleSwipeLeft - Create left swipe handler
 * @returns handleSwipeRight - Create right swipe handler
 * @returns handleSwipeDown - Create down swipe handler
 * 
 * @example
 * ```tsx
 * const { handleSwipeLeft, handleSwipeRight } = useGestures();
 * 
 * return (
 *   <div
 *     onTouchEnd={handleSwipeLeft(() => console.log('Swiped left'))}
 *     onTouchEnd={handleSwipeRight(() => navigate('/back'))}
 *   >
 *     Swipe me!
 *   </div>
 * );
 * 
 * // Common use case: swipe to delete
 * <Card onTouchEnd={handleSwipeLeft(() => deleteItem(id))}>
 *   {item.name}
 * </Card>
 * ```
 */
export function useGestures() {
  const handleSwipeLeft = useCallback((callback: () => void) => {
    return (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const startX = e.touches[0]?.clientX || 0;
      const endX = touch.clientX;
      
      if (startX - endX > 75) { // 75px threshold
        callback();
      }
    };
  }, []);

  const handleSwipeRight = useCallback((callback: () => void) => {
    return (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const startX = e.touches[0]?.clientX || 0;
      const endX = touch.clientX;
      
      if (endX - startX > 75) { // 75px threshold
        callback();
      }
    };
  }, []);

  const handleSwipeDown = useCallback((callback: () => void) => {
    return (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const startY = e.touches[0]?.clientY || 0;
      const endY = touch.clientY;
      
      if (endY - startY > 75) { // 75px threshold
        callback();
      }
    };
  }, []);

  return {
    handleSwipeLeft,
    handleSwipeRight,
    handleSwipeDown,
  };
}

// Pull-to-refresh handler
export function usePullToRefreshGesture(onRefresh: () => Promise<void>) {
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    return {
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    async (startY: number, startTime: number, currentY: number) => {
      const deltaY = currentY - startY;
      const deltaTime = Date.now() - startTime;

      // Pull down > 100px and within 500ms
      if (deltaY > 100 && deltaTime < 500 && startY < 50) {
        await onRefresh();
      }
    },
    [onRefresh]
  );

  return {
    handleTouchStart,
    handleTouchEnd,
  };
}
