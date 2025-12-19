import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type EmployeeStatus = 'present' | 'sick' | 'leave' | 'offline' | 'unknown'

const statusColors: Record<EmployeeStatus, string> = {
  present: 'ring-green-500',
  sick: 'ring-red-500',
  leave: 'ring-blue-500',
  offline: 'ring-gray-400',
  unknown: 'ring-muted',
}

const statusLabels: Record<EmployeeStatus, string> = {
  present: 'Aanwezig',
  sick: 'Ziek',
  leave: 'Verlof',
  offline: 'Offline',
  unknown: 'Onbekend',
}

const statusBadgeColors: Record<EmployeeStatus, string> = {
  present: 'bg-green-100 text-green-800 border-green-200',
  sick: 'bg-red-100 text-red-800 border-red-200',
  leave: 'bg-blue-100 text-blue-800 border-blue-200',
  offline: 'bg-gray-100 text-gray-800 border-gray-200',
  unknown: 'bg-muted text-muted-foreground border-border',
}

interface StatusAvatarProps {
  src?: string
  fallback: string
  status?: EmployeeStatus
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBadge?: boolean
  className?: string
}

export const StatusAvatar = ({ 
  src, 
  fallback, 
  status = 'unknown',
  size = 'md',
  showBadge = false,
  className
}: StatusAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }
  
  const badgeSizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  }
  
  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar 
        className={cn(
          sizeClasses[size],
          'ring-2 ring-offset-2 ring-offset-background',
          statusColors[status]
        )}
      >
        <AvatarImage src={src} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      
      {showBadge && (
        <span 
          className={cn(
            'absolute bottom-0 right-0 block rounded-full',
            badgeSizes[size],
            statusColors[status].replace('ring-', 'bg-'),
            'ring-2 ring-background'
          )}
          aria-label={statusLabels[status]}
        />
      )}
    </div>
  )
}

interface StatusBadgeProps {
  status: EmployeeStatus
  className?: string
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  return (
    <Badge className={cn('text-xs', statusBadgeColors[status], className)}>
      {statusLabels[status]}
    </Badge>
  )
}
