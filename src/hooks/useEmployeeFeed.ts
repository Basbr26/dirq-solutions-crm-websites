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

      return (data || []).map((event: any) => ({
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
