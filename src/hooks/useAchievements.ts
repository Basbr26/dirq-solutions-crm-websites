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

/**
 * Employee Achievements Hook
 * Fetches gamification achievements and points history for current user.
 * Part of employee engagement/HR gamification system.
 * 
 * @returns Object with achievements and points queries
 * @returns achievementsQuery - Query for earned achievements
 * @returns pointsQuery - Query for points balance and history
 * 
 * @example
 * ```tsx
 * const { achievementsQuery, pointsQuery } = useAchievements();
 * const achievements = achievementsQuery.data || [];
 * const points = pointsQuery.data;
 * 
 * return (
 *   <div>
 *     <h2>Total Points: {points?.totalPoints}</h2>
 *     {achievements.map(achievement => (
 *       <AchievementBadge 
 *         key={achievement.id}
 *         icon={achievement.icon}
 *         name={achievement.name}
 *         points={achievement.points}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useAchievements() {
  const { user } = useAuth();

  const achievementsQuery = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Return mock achievements from gamification definitions
      // In production, would fetch from database
      return [
        {
          id: '1',
          type: 'tenure' as const,
          name: 'Newcomer',
          icon: '👋',
          color: 'bg-blue-500',
          points: 10,
          earnedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: '2',
          type: 'performance' as const,
          name: 'High Performer',
          icon: '⭐',
          color: 'bg-yellow-500',
          points: 50,
          earnedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ] as Achievement[];
    },
    enabled: !!user?.id,
  });

  const pointsQuery = useQuery({
    queryKey: ['employeePoints', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Return mock points data
      // In production, would fetch from employee_points_history table
      return {
        totalPoints: 110,
        totalEarned: 110,
        totalRedeemed: 0,
        recentHistory: [
          {
            action: 'referral_hired',
            points: 100,
            description: 'Team member hired through referral',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            action: 'training',
            points: 10,
            description: 'Completed online training',
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        ],
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
