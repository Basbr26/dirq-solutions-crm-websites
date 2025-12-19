import { SwipeableCard } from '@/components/ui/swipeable-card'
import { Card } from '@/components/ui/card'
import { StatusAvatar } from '@/components/ui/status-avatar'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface LeaveRequest {
  id: string
  start_date: string
  end_date: string
  total_days: number
  leave_type: string
  notes?: string
  status: string
  employee?: {
    id: string
    voornaam: string
    achternaam: string
    functie?: string
    foto_url?: string
  }
}

interface LeaveRequestCardProps {
  request: LeaveRequest
  onSwipe?: () => void
}

export const LeaveRequestCard = ({ request, onSwipe }: LeaveRequestCardProps) => {
  const queryClient = useQueryClient()
  
  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', request.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      toast.success('Verlof goedgekeurd! ✅')
      onSwipe?.()
    },
    onError: () => {
      toast.error('Fout bij goedkeuren')
    }
  })
  
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      toast.error('Verlof afgewezen')
      onSwipe?.()
    },
    onError: () => {
      toast.error('Fout bij afwijzen')
    }
  })
  
  return (
    <SwipeableCard
      onSwipeRight={() => approveMutation.mutate()}
      onSwipeLeft={() => rejectMutation.mutate()}
      disabled={request.status !== 'pending'}
    >
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <StatusAvatar
            src={request.employee?.foto_url}
            fallback={`${request.employee?.voornaam?.[0]}${request.employee?.achternaam?.[0]}`}
            status="leave"
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <div className="font-medium">
              {request.employee?.voornaam} {request.employee?.achternaam}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(request.start_date), 'dd MMM', { locale: nl })} - {format(new Date(request.end_date), 'dd MMM yyyy', { locale: nl })}
            </div>
            <div className="text-sm text-muted-foreground">
              {request.total_days} dagen • {request.leave_type}
            </div>
            {request.notes && (
              <p className="text-sm mt-2 line-clamp-2">{request.notes}</p>
            )}
          </div>
        </div>
      </Card>
    </SwipeableCard>
  )
}
