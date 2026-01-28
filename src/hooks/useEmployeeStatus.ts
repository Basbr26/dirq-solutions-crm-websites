import { useQuery } from '@tantml:parameter name="query">@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { EmployeeStatus } from '@/components/ui/status-avatar'

/**
 * Employee Status Query Hook
 * Determines employee's current status (present, sick, on leave) by checking
 * active sick leave cases and approved leave requests for today.
 * 
 * @param employeeId - The employee's user ID
 * @returns React Query result with employee status
 * @returns data - Status: 'present' | 'sick' | 'leave'
 * 
 * @example
 * ```tsx
 * const { data: status } = useEmployeeStatus(employee.id);
 * 
 * return (
 *   <StatusAvatar 
 *     status={status} 
 *     name={employee.name}
 *   />
 * );
 * 
 * // Status badge
 * {status === 'sick' && <Badge variant="destructive">Sick Leave</Badge>}
 * {status === 'leave' && <Badge variant="secondary">On Leave</Badge>}
 * ```
 */
export const useEmployeeStatus = (employeeId: string) => {
  return useQuery({
    queryKey: ['employee-status', employeeId],
    queryFn: async (): Promise<EmployeeStatus> => {
      const today = new Date().toISOString().split('T')[0]
      
      // Check for active sick leave today
      const { data: sickCase } = await supabase
        .from('verzuim_cases')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .lte('start_date', today)
        .or(`expected_return_date.is.null,expected_return_date.gte.${today}`)
        .maybeSingle()
      
      if (sickCase) return 'sick'
      
      // Check for approved leave today
      const { data: leave } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle()
      
      if (leave) return 'leave'
      
      // Default to present (could add last_activity check here)
      return 'present'
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
