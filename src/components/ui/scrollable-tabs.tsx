import * as React from "react";
import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScrollableTabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A wrapper for TabsList that enables horizontal scrolling on mobile
 * with a hidden scrollbar and fade indicator on the right edge.
 */
export function ScrollableTabsList({ 
  children, 
  className,
  ...props 
}: ScrollableTabsListProps) {
  return (
    <div 
      className={cn(
        // Container for scroll - negative margin to extend to edges, then padding to bring content back
        "relative -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0",
        className
      )}
      {...props}
    >
      <TabsList 
        className={cn(
          // Mobile: Horizontal scroll with hidden scrollbar
          "flex w-auto min-w-full justify-start gap-1",
          "overflow-x-auto scrollbar-hide",
          // Desktop: Normal inline-flex behavior
          "md:inline-flex md:w-auto md:overflow-visible",
          // Smooth scroll with snap
          "scroll-smooth snap-x snap-mandatory md:snap-none",
          // Background and padding
          "bg-muted p-1 rounded-lg"
        )}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </TabsList>
      {/* Fade indicator on right edge (mobile only) */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" 
        aria-hidden="true"
      />
    </div>
  );
}

interface ScrollableTabTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsTrigger> {
  children: React.ReactNode;
}

/**
 * A TabsTrigger optimized for scrollable tabs with touch-friendly sizing.
 */
export function ScrollableTabTrigger({ 
  children, 
  className, 
  ...props 
}: ScrollableTabTriggerProps) {
  return (
    <TabsTrigger 
      className={cn(
        // Prevent shrinking, enable snap
        "flex-shrink-0 snap-center",
        // Touch-friendly height and padding
        "min-h-[44px] px-3 sm:px-4",
        // Text styling
        "text-sm whitespace-nowrap",
        className
      )} 
      {...props}
    >
      {children}
    </TabsTrigger>
  );
}
