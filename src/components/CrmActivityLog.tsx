import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CrmActivityEntry {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  user?: {
    voornaam: string;
    achternaam: string;
  };
}

interface CrmActivityLogProps {
  entityId: string;
  entityType: 'company' | 'contact';
}

const actionIcons: Record<string, ReactNode> = {
  company_created: <Plus className="h-4 w-4" />,
  company_updated: <Edit className="h-4 w-4" />,
  company_deleted: <Trash2 className="h-4 w-4" />,
  contact_created: <Plus className="h-4 w-4" />,
  contact_updated: <Edit className="h-4 w-4" />,
  contact_deleted: <Trash2 className="h-4 w-4" />,
  bulk_deleted: <Trash2 className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  company_created: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  company_updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  company_deleted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  contact_created: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  contact_updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  contact_deleted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  bulk_deleted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function CrmActivityLog({ entityId, entityType }: CrmActivityLogProps) {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language === 'nl' ? nl : enUS;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['crm-activity', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action_type,
          description,
          created_at,
          user:profiles!activity_logs_user_id_fkey(voornaam, achternaam)
        `)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as unknown as CrmActivityEntry[]) || [];
    },
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <CardContent className="pt-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    );
  }

  if (activities.length === 0) {
    return (
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
          <Clock className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nog geen activiteit geregistreerd</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="pt-6">
      <div className="space-y-4">
        {activities.map((activity) => {
          const userName = activity.user
            ? `${activity.user.voornaam} ${activity.user.achternaam}`
            : 'Onbekend';

          return (
            <div
              key={activity.id}
              className="flex gap-3 pb-4 border-b border-border last:border-0"
            >
              <div className={`p-2 rounded-full h-fit shrink-0 ${actionColors[activity.action_type] || 'bg-muted text-muted-foreground'}`}>
                {actionIcons[activity.action_type] || <Edit className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">door {userName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  );
}
