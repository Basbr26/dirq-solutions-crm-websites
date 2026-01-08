import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  /** Whether to show on all screen sizes (default: mobile only) */
  showOnDesktop?: boolean;
}

/**
 * A Floating Action Button (FAB) for mobile interfaces.
 * Positioned above the bottom navigation with safe area support.
 * Only visible on mobile by default.
 */
export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="h-6 w-6" />,
  label = "Nieuw",
  className,
  showOnDesktop = false,
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        // Positioning - above bottom nav
        "fixed z-40",
        "right-4",
        // Visibility
        showOnDesktop ? "" : "md:hidden",
        // Styling
        "h-14 w-14 rounded-full shadow-lg",
        "bg-primary hover:bg-primary/90",
        "flex items-center justify-center",
        // Touch feedback
        "active:scale-95 transition-transform",
        className
      )}
      style={{
        bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label={label}
    >
      {icon}
    </Button>
  );
}

interface FloatingActionMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * An expandable FAB menu that shows multiple actions.
 */
export function FloatingActionMenu({
  open,
  onOpenChange,
  trigger,
  children,
  className,
}: FloatingActionMenuProps) {
  return (
    <div 
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 md:hidden",
        className
      )}
      style={{
        bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Actions - shown when open */}
      {open && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {children}
        </div>
      )}
      
      {/* Main FAB trigger */}
      <Button
        onClick={() => onOpenChange(!open)}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90",
          "flex items-center justify-center",
          "active:scale-95 transition-all duration-200",
          open && "rotate-45"
        )}
        aria-label={open ? "Sluiten" : "Menu openen"}
        aria-expanded={open}
      >
        {trigger || <Plus className="h-6 w-6" />}
      </Button>
      
      {/* Backdrop when open */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

interface FloatingActionItemProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

/**
 * An action item for use inside FloatingActionMenu.
 */
export function FloatingActionItem({
  onClick,
  icon,
  label,
  className,
}: FloatingActionItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-card text-foreground px-3 py-1.5 rounded-lg shadow-md text-sm font-medium">
        {label}
      </span>
      <Button
        onClick={onClick}
        className={cn(
          "h-12 w-12 rounded-full shadow-md",
          "bg-card hover:bg-accent text-foreground",
          "flex items-center justify-center",
          "active:scale-95 transition-transform",
          className
        )}
        aria-label={label}
      >
        {icon}
      </Button>
    </div>
  );
}
