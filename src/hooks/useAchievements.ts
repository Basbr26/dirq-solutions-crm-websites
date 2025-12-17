import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Achievement {
  id: string;
  type: 'tenure' | 'performance' | 'social' | 'learning';
  name: string;
  icon: string;
  color: string;
  points: number;
  earnedDate: Date;
}

export interface PointsHistory {
  totalPoints: number;
  totalEarned: number;
  totalRedeemed: number;
  recentHistory: Array<{
    action: string;
    points: number;
    description: string;
    date: Date;
  }>;
}

export function useAchievements() {
  const { user } = useAuth();

  const achievementsQuery = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('employee_achievements')
        .select('*')
        .eq('employee_id', user.id)
        .order('earned_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(achievement => ({
        id: achievement.id,
        type: achievement.achievement_type,
        name: achievement.achievement_name,
        icon: achievement.badge_icon,
        color: achievement.badge_color,
        points: achievement.points,
        earnedDate: new Date(achievement.earned_date),
      })) as Achievement[];
    },
    enabled: !!user?.id,
  });

  const pointsQuery = useQuery({
    queryKey: ['employeePoints', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('employee_points_history')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const recentHistory = (data || []).slice(0, 10).map(entry => ({
        action: entry.action_type,
        points: entry.points_earned,
        description: entry.description || '',
        date: new Date(entry.created_at),
      }));

      const totalEarned = (data || [])
        .filter(entry => entry.points_earned > 0)
        .reduce((sum, entry) => sum + entry.points_earned, 0);

      const totalRedeemed = (data || [])
        .filter(entry => entry.redeemed)
        .reduce((sum, entry) => sum + entry.points_earned, 0);

      return {
        totalPoints: totalEarned - totalRedeemed,
        totalEarned,
        totalRedeemed,
        recentHistory,
      } as PointsHistory;
    },
    enabled: !!user?.id,
  });

  return {
    achievements: achievementsQuery.data || [],
    points: pointsQuery.data,
    isLoading: achievementsQuery.isLoading || pointsQuery.isLoading,
    error: achievementsQuery.error || pointsQuery.error,
  };
}
