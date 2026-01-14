import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { haptics } from '@/lib/haptics'

interface SwipeableCardProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: {
    label: string
    icon?: React.ReactNode
    color: string
  }
  rightAction?: {
    label: string
    icon?: React.ReactNode
    color: string
  }
  children: React.ReactNode
  disabled?: boolean
}

const SWIPE_THRESHOLD = 100

export const SwipeableCard = ({
  onSwipeLeft,
  onSwipeRight,
  leftAction = { 
    label: 'Afwijzen', 
    icon: <X className="h-6 w-6" />,
    color: 'bg-red-500' 
  },
  rightAction = { 
    label: 'Goedkeuren', 
    icon: <Check className="h-6 w-6" />,
    color: 'bg-green-500' 
  },
  children,
  disabled = false,
}: SwipeableCardProps) => {
  const [exitX, setExitX] = useState(0)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
  
  // Background colors based on swipe direction
  const leftBgOpacity = useTransform(x, [-200, 0], [1, 0])
  const rightBgOpacity = useTransform(x, [0, 200], [0, 1])
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (disabled) return
    
    const offset = info.offset.x
    const velocity = info.velocity.x
    
    // Strong swipe or drag past threshold
    if (Math.abs(velocity) > 500 || Math.abs(offset) > SWIPE_THRESHOLD) {
      if (offset > 0 && onSwipeRight) {
        haptics.success()
        setExitX(1000)
        setTimeout(() => onSwipeRight(), 200)
      } else if (offset < 0 && onSwipeLeft) {
        haptics.warning()
        setExitX(-1000)
        setTimeout(() => onSwipeLeft(), 200)
      }
    }
  }
  
  return (
    <div className="relative">
      {/* Left action background */}
      <motion.div
        className={`absolute inset-0 flex items-center justify-end pr-6 rounded-lg ${leftAction.color}`}
        style={{ opacity: leftBgOpacity }}
      >
        <div className="flex items-center gap-2 text-white">
          {leftAction.icon}
          <span className="font-medium">{leftAction.label}</span>
        </div>
      </motion.div>
      
      {/* Right action background */}
      <motion.div
        className={`absolute inset-0 flex items-center justify-start pl-6 rounded-lg ${rightAction.color}`}
        style={{ opacity: rightBgOpacity }}
      >
        <div className="flex items-center gap-2 text-white">
          {rightAction.icon}
          <span className="font-medium">{rightAction.label}</span>
        </div>
      </motion.div>
      
      {/* Swipeable card */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        animate={{ x: exitX }}
        transition={{
          x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        }}
        whileTap={{ cursor: 'grabbing' }}
        className="relative bg-background cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  )
}
