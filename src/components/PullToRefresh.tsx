import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, progress, shouldTrigger } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    maxPull: 120,
  });

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
    >
      {/* Pull indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10 transition-opacity duration-200"
        style={{ 
          top: Math.max(pullDistance - 50, -50),
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div 
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 shadow-lg",
            shouldTrigger && "bg-primary/20"
          )}
        >
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-all duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div 
        className="transition-transform duration-200"
        style={{ 
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transitionDuration: pullDistance === 0 ? '200ms' : '0ms',
        }}
      >
        {children}
      </div>
    </div>
  );
}
