import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

type BreakPoint = 'sm' | 'md' | 'lg' | 'xl';

interface ResponsiveButtonProps extends ButtonProps {
  /** The icon to display (always visible) */
  icon: React.ReactNode;
  /** The text label (hidden on mobile, shown at breakpoint) */
  label: string;
  /** At which breakpoint to show the label (default: 'sm' = 640px) */
  showLabelAt?: BreakPoint;
  /** Whether to show tooltip on mobile when label is hidden (default: true) */
  showTooltip?: boolean;
}

const breakpointClasses: Record<BreakPoint, string> = {
  sm: 'hidden sm:inline',
  md: 'hidden md:inline',
  lg: 'hidden lg:inline',
  xl: 'hidden xl:inline',
};

/**
 * A button that shows icon-only on mobile and icon + label on larger screens.
 * Includes a tooltip for accessibility when the label is hidden.
 */
export function ResponsiveButton({ 
  icon, 
  label, 
  showLabelAt = 'sm',
  showTooltip = true,
  className,
  children,
  ...props 
}: ResponsiveButtonProps) {
  const button = (
    <Button
      className={cn(
        // Ensure touch-friendly size
        "min-h-[44px] min-w-[44px]",
        // Adjust padding based on content
        "px-3 sm:px-4",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span className={breakpointClasses[showLabelAt]}>
          {label}
        </span>
      </span>
      {children}
    </Button>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent className={`${showLabelAt}:hidden`}>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  /** Stack buttons vertically on mobile */
  stackOnMobile?: boolean;
}

/**
 * A container for responsive buttons that handles spacing and layout.
 */
export function ResponsiveButtonGroup({
  children,
  className,
  stackOnMobile = false,
}: ResponsiveButtonGroupProps) {
  return (
    <div 
      className={cn(
        "flex gap-2",
        stackOnMobile && "flex-col sm:flex-row",
        className
      )}
    >
      {children}
    </div>
  );
}

interface IconOnlyButtonProps extends ButtonProps {
  icon: React.ReactNode;
  label: string;
}

/**
 * A button that always shows only an icon, with tooltip for accessibility.
 */
export function IconOnlyButton({
  icon,
  label,
  className,
  ...props
}: IconOnlyButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "h-10 w-10 p-0",
              "min-h-[44px] min-w-[44px]", // Touch target
              className
            )}
            {...props}
          >
            {icon}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
