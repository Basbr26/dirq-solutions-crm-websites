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

        // Fetch team status for entire month
        const { data, error: err } = await supabase
          .from('team_daily_status')
          .select('*')
          .eq('manager_id', managerId)
          .gte('date', firstDay.toISOString().split('T')[0])
          .lte('date', lastDay.toISOString().split('T')[0]);

        if (err) throw err;

        // Build calendar structure
        const daysInMonth = lastDay.getDate();
        const days: TeamCalendarDay[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = new Date(year, month, day)
            .toISOString()
            .split('T')[0];
          const dayData = data?.find((d) => d.date === dateStr);

          days.push({
            date: new Date(year, month, day),
            capacity: dayData?.capacity_percentage || 100,
            onLeave: dayData?.on_leave || 0,
            sick: dayData?.sick || 0,
            teamSize: dayData?.total_team_size || 0,
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
