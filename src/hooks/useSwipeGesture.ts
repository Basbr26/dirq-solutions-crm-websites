import { useCallback, useRef, useState } from 'react';

interface SwipeThresholds {
  x: number; // 50px to trigger horizontal swipe
  y: number; // 30px to trigger vertical swipe
  velocity: number; // 0.5 px/ms
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
}

const DEFAULT_THRESHOLDS: SwipeThresholds = {
  x: 50,
  y: 30,
  velocity: 0.5,
};

export function useSwipeGesture(
  handlers: SwipeHandlers,
  thresholds = DEFAULT_THRESHOLDS
) {
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const offsetX = touch.clientX - touchStart.current.x;
    const offsetY = touch.clientY - touchStart.current.y;

    setDragOffset({ x: offsetX, y: offsetY });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    const deltaX = dragOffset.x;
    const deltaY = dragOffset.y;
    const deltaTime = Date.now() - touchStart.current.time;
    const velocity = Math.abs(deltaX) / Math.max(deltaTime, 1);

    // Reset drag
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });

    // Check thresholds
    if (
      Math.abs(deltaX) > thresholds.x &&
      velocity > thresholds.velocity
    ) {
      if (deltaX > 0) {
        handlers.onSwipeRight?.();
      } else {
        handlers.onSwipeLeft?.();
      }
    } else if (Math.abs(deltaY) > thresholds.y) {
      if (deltaY > 0) {
        handlers.onSwipeDown?.();
      } else {
        handlers.onSwipeUp?.();
      }
    }
  }, [dragOffset, handlers, thresholds]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    dragOffset,
    isDragging,
  };
}
