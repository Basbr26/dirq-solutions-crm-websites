import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TeamCalendarDay {
  date: Date;
  capacity: number; // 0-100
  onLeave: number;
  sick: number;
  teamSize: number;
}

interface TeamCalendarMonth {
  year: number;
  month: number;
  days: TeamCalendarDay[];
}

export function useTeamCalendar(managerId: string) {
  const [calendar, setCalendar] = useState<TeamCalendarMonth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamCalendar = useCallback(
    async (year: number, month: number) => {
      try {
        setIsLoading(true);
        setError(null);

        // Get first and last day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Fetch leave requests for the month
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('start_date, end_date, status')
          .eq('status', 'approved')
          .gte('start_date', firstDay.toISOString().split('T')[0])
          .lte('end_date', lastDay.toISOString().split('T')[0]);

        // Fetch sick leave cases for the month (active cases without end_date or end_date in future)
        const { data: sickData } = await supabase
          .from('sick_leave_cases')
          .select('start_date, end_date')
          .gte('start_date', firstDay.toISOString().split('T')[0]);

        // Get team size (count of profiles managed by this manager)
        const { count: teamSize } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('manager_id', managerId);

        // Build calendar structure
        const daysInMonth = lastDay.getDate();
        const days: TeamCalendarDay[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(year, month, day);
          const dateStr = currentDate.toISOString().split('T')[0];

          // Count people on leave this day
          const onLeave = leaveData?.filter((leave) => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            return currentDate >= start && currentDate <= end;
          }).length || 0;

          // Count people sick this day
          const sick = sickData?.filter((sickLeave) => {
            const start = new Date(sickLeave.start_date);
            const end = sickLeave.end_date ? new Date(sickLeave.end_date) : new Date();
            return currentDate >= start && currentDate <= end;
          }).length || 0;

          const totalAbsent = onLeave + sick;
          const capacity = teamSize ? Math.max(0, Math.round(((teamSize - totalAbsent) / teamSize) * 100)) : 100;

          days.push({
            date: currentDate,
            capacity,
            onLeave,
            sick,
            teamSize: teamSize || 0,
          });
        }

        setCalendar({
          year,
          month,
          days,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch calendar');
      } finally {
        setIsLoading(false);
      }
    },
    [managerId]
  );

  useEffect(() => {
    const today = new Date();
    fetchTeamCalendar(today.getFullYear(), today.getMonth());
  }, [fetchTeamCalendar]);

  const getNextMonth = useCallback(() => {
    if (!calendar) return;
    const { year, month } = calendar;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    fetchTeamCalendar(nextYear, nextMonth);
  }, [calendar, fetchTeamCalendar]);

  const getPreviousMonth = useCallback(() => {
    if (!calendar) return;
    const { year, month } = calendar;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    fetchTeamCalendar(prevYear, prevMonth);
  }, [calendar, fetchTeamCalendar]);

  const getCapacityStatus = (capacity: number) => {
    if (capacity >= 80) return 'healthy';
    if (capacity >= 60) return 'warning';
    return 'critical';
  };

  return {
    calendar,
    isLoading,
    error,
    fetchTeamCalendar,
    getNextMonth,
    getPreviousMonth,
    getCapacityStatus,
  };
}
