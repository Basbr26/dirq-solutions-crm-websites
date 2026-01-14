import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-lg p-4 border border-border animate-pulse", className)}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 5, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded flex-1 animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-border">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex gap-4">
              {[...Array(columns)].map((_, colIndex) => (
                <div
                  key={colIndex}
                  className={cn(
                    "h-3 bg-muted rounded flex-1 animate-pulse",
                    colIndex === 0 && "w-1/4"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
