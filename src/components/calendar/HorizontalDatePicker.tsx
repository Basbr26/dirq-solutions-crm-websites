import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay,
  isToday,
  addMonths,
  subMonths
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface HighlightedDate {
  date: Date
  color: string
  label: string
}

interface HorizontalDatePickerProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  markedDates?: Date[]
  highlightedDates?: HighlightedDate[]
}

export const HorizontalDatePicker = ({
  selectedDate,
  onDateSelect,
  markedDates = [],
  highlightedDates = [],
}: HorizontalDatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })
  
  const selectedDayIndex = days.findIndex(day => isSameDay(day, selectedDate))
  
  // Auto-scroll to selected day
  useEffect(() => {
    if (scrollRef.current && selectedDayIndex !== -1) {
      const dayWidth = 56 // w-14 = 56px
      const containerWidth = scrollRef.current.offsetWidth
      const scrollPosition = (selectedDayIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2)
      
      scrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      })
    }
  }, [selectedDayIndex])
  
  const getHighlight = (date: Date) => {
    return highlightedDates.find(h => isSameDay(h.date, date))
  }
  
  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy', { locale: nl })}
        </h3>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Horizontal scrolling days */}
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-2 pb-2"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {days.map((day) => {
          const highlight = getHighlight(day)
          const isSelected = isSameDay(day, selectedDate)
          const isMarked = markedDates.some(d => isSameDay(d, day))
          const isTodayDate = isToday(day)
          
          return (
            <motion.button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-2xl border-2 transition-all",
                "scroll-snap-align-center",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                  : "bg-background border-border hover:border-primary/50",
                isTodayDate && !isSelected && "border-primary/50"
              )}
              style={{
                scrollSnapAlign: 'center',
              }}
            >
              {/* Day name */}
              <span className={cn(
                "text-xs font-medium uppercase",
                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {format(day, 'EEE', { locale: nl })}
              </span>
              
              {/* Day number */}
              <span className={cn(
                "text-xl font-bold mt-1",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Indicators */}
              <div className="flex gap-1 mt-1">
                {isMarked && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )} />
                )}
                {highlight && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    `bg-${highlight.color}-500`
                  )} />
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
