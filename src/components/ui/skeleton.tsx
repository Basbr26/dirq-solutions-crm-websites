import { cn } from "@/lib/utils";

function Skeleton({ 
  className, 
  animate = true,
  shimmer = true,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { animate?: boolean; shimmer?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        animate && "animate-pulse",
        shimmer && "skeleton-shimmer",
        className
      )}
      {...props}
    />
  );
}

// Skeleton variants
export const SkeletonText = ({ lines = 1, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
)

export const SkeletonAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }
  
  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />
}

export const SkeletonButton = () => (
  <Skeleton className="h-10 w-24 rounded-md" />
)

export const SkeletonCard = () => (
  <div className="p-4 border rounded-lg">
    <div className="flex items-center gap-3">
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-5 w-5 rounded" />
    </div>
  </div>
)

export { Skeleton };
