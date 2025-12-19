import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FullScreenSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export const FullScreenSheet = ({ 
  open, 
  onClose, 
  title, 
  children,
  footer,
  className
}: FullScreenSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-[95vh] md:h-auto md:max-w-2xl rounded-t-3xl md:rounded-lg p-0 flex flex-col",
          className
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        {/* Scrollable content */}
        <div 
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          {children}
        </div>
        
        {/* Footer (sticky) */}
        {footer && (
          <div 
            className="px-6 py-4 border-t bg-background flex-shrink-0"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
