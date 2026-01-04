import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  shouldPreventDefault?: boolean
  delay?: number
}

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
