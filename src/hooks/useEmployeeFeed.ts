import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FeedUpdate {
  id: string;
  type: 'verlof_approved' | 'birthday' | 'anniversary' | 'training_available' | 'document_ready' | 'team_news' | 'certification_expiring' | 'goal_achieved';
  title: string;
  subtitle: string;
  icon: string;
  actionUrl?: string;
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
  read: boolean;
}

/**
 * Employee Feed Query Hook
 * Fetches personalized activity feed for current user including:
 * - Leave approvals
 * - Birthdays/anniversaries
 * - Training opportunities
 * - Document notifications
 * - Team news
 * - Certifications
 * - Goal achievements
 * 
 * @returns Object with feed data and controls
 * @returns feed - Array of feed updates sorted by timestamp (newest first)
 * @returns isLoading - Initial loading state
 * @returns isRefetching - Refresh loading state
 * @returns error - Error object if query failed
 * @returns markAsRead - Mark specific feed item as read
 * @returns refresh - Manually trigger feed refresh
 * 
 * @example
 * ```tsx
 * const { feed, isLoading, markAsRead, refresh } = useEmployeeFeed();
 * 
 * return (
 *   <div>
 *     <Button onClick={refresh}>Refresh</Button>
 *     {feed.map(item => (
 *       <FeedCard 
 *         key={item.id}
 *         {...item}
 *         onRead={() => markAsRead(item.id)}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useEmployeeFeed() {
  const { user } = useAuth();

  const feedQuery = useQuery({
    queryKey: ['employeeFeed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      interface NotificationEvent {
        id: string;
        notification_type: string;
        title: string;
        message: string | null;
        created_at: string;
        is_read: boolean;
      }

      return (data || []).map((event: NotificationEvent) => ({
        id: event.id,
        type: event.notification_type,
        title: event.title,
        subtitle: event.message || '',
        icon: '📝',
        actionUrl: '',
        timestamp: new Date(event.created_at),
        priority: 'normal' as const,
        read: event.is_read,
      })) as FeedUpdate[];
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (feedId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', feedId);

      if (error) throw error;
    },
    onSuccess: () => {
      feedQuery.refetch();
    },
  });

  const refreshFeed = () => feedQuery.refetch();

  return {
    feed: feedQuery.data || [],
    isLoading: feedQuery.isLoading,
    isRefetching: feedQuery.isRefetching,
    error: feedQuery.error,
    markAsRead: (feedId: string) => markAsReadMutation.mutate(feedId),
    refresh: refreshFeed,
    unreadCount: (feedQuery.data || []).filter(f => !f.read).length,
  };
}
