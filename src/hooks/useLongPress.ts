import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  shouldPreventDefault?: boolean
  delay?: number
}

/**
 * Long press gesture hook for touch and mouse events
 * Triggers callback after user holds down for specified duration.
 * 
 * @param onLongPress - Callback fired after long press duration
 * @param onClick - Optional callback for regular click (before long press)
 * @param options - Configuration options
 * @param options.shouldPreventDefault - Prevent default touch behavior (default: true)
 * @param options.delay - Long press duration in milliseconds (default: 500)
 * @returns Event handlers to spread on target element
 * 
 * @example
 * ```tsx
 * const longPressHandlers = useLongPress(
 *   () => console.log('Long pressed!'),
 *   () => console.log('Regular click'),
 *   { delay: 800 }
 * );
 * 
 * return <button {...longPressHandlers}>Hold me</button>;
 * ```
 */
export const useLongPress = (
  onLongPress: () => void,
  onClick?: () => void,
  { shouldPreventDefault = true, delay = 500 }: UseLongPressOptions = {}
) => {
  const timeout = useRef<NodeJS.Timeout>()
  const target = useRef<EventTarget>()
  
  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false,
        })
        target.current = event.target
      }
      timeout.current = setTimeout(() => {
        onLongPress()
      }, delay)
    },
    [onLongPress, delay, shouldPreventDefault]
  )
  
  const clear = useCallback(
    (event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timeout.current) clearTimeout(timeout.current)
      if (shouldTriggerClick && onClick) onClick()
      
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault)
      }
    },
    [onClick, shouldPreventDefault]
  )
  
  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
  }
}

const preventDefault = (event: Event) => {
  if (!isTouchEvent(event)) return
  
  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault()
  }
}

const isTouchEvent = (event: Event): event is TouchEvent => {
  return 'touches' in event
}
