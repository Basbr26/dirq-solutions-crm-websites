import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LeaveBalance {
  totalDays: number;
  takenDays: number;
  plannedDays: number;
  availableDays: number;
  lastUpdated: Date;
}

export function useLeaveBalance() {
  const { user } = useAuth();

  const leaveBalanceQuery = useQuery({
    queryKey: ['leaveBalance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: caseData, error: caseError } = await supabase
        .from('sick_leave_cases')
        .select('*')
        .eq('employee_id', user.id)
        .single();

      if (caseError && caseError.code !== 'PGRST116') throw caseError;

      // Calculate leave from database
      // This is simplified - in reality would come from HR system
      const totalDays = 25; // Standard annual leave
      const takenDays = caseData?.days_off || 0;
      const plannedDays = 0; // Would query pending requests
      const availableDays = totalDays - takenDays - plannedDays;

      return {
        totalDays,
        takenDays,
        plannedDays,
        availableDays,
        lastUpdated: new Date(),
      } as LeaveBalance;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    balance: leaveBalanceQuery.data || null,
    isLoading: leaveBalanceQuery.isLoading,
    error: leaveBalanceQuery.error,
    refetch: leaveBalanceQuery.refetch,
  };
}
