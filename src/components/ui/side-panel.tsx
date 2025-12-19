import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"

interface SidePanelProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
  width?: "sm" | "md" | "lg" | "xl"
}

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

export function SidePanel({ 
  open, 
  onClose, 
  children, 
  title, 
  className,
  width = "lg" 
}: SidePanelProps) {
  React.useEffect(() => {
    if (open) {
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop - desktop only */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 hidden lg:block"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full bg-background shadow-lg",
          "lg:border-l lg:w-auto",
          widthClasses[width],
          "overflow-y-auto",
          "transition-transform duration-300 ease-in-out",
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 z-10 bg-background border-b px-4 md:px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Content */}
        <div className="px-4 md:px-6 py-4">
          {children}
        </div>
      </div>
    </>
  )
}
