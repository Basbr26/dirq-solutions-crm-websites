import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  CheckCircle2, 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare,
  RefreshCw,
  User,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { actionTypeLabels, ActionType } from '@/lib/activityLogger';

interface ActivityLogEntry {
  id: string;
  user_id: string;
  case_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    voornaam: string;
    achternaam: string;
  };
}

interface ActivityLogProps {
  caseId?: string;
  limit?: number;
  showHeader?: boolean;
}

const actionIcons: Record<string, ReactNode> = {
  case_created: <Plus className="h-4 w-4" />,
  case_updated: <Edit className="h-4 w-4" />,
  case_closed: <CheckCircle2 className="h-4 w-4" />,
  case_reopened: <RefreshCw className="h-4 w-4" />,
  task_created: <Plus className="h-4 w-4" />,
  task_completed: <CheckCircle2 className="h-4 w-4" />,
  task_updated: <Edit className="h-4 w-4" />,
  document_uploaded: <FileText className="h-4 w-4" />,
  document_signed: <CheckCircle2 className="h-4 w-4" />,
  document_deleted: <Trash2 className="h-4 w-4" />,
  conversation_added: <MessageSquare className="h-4 w-4" />,
  status_changed: <RefreshCw className="h-4 w-4" />,
  recovery_reported: <CheckCircle2 className="h-4 w-4" />,
  user_login: <User className="h-4 w-4" />,
  user_logout: <User className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  case_created: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  case_closed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  task_completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  document_deleted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  recovery_reported: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
};

export function ActivityLog({ caseId, limit = 50, showHeader = true }: ActivityLogProps) {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Get locale for date-fns
  const dateLocale = i18n.language === 'nl' ? nl : enUS;

  useEffect(() => {
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const loadActivities = async () => {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles!activity_logs_user_id_fkey (
            voornaam,
            achternaam
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities((data as unknown as ActivityLogEntry[]) || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('activities.title')}
          </CardTitle>
          <CardDescription>
            {t('activities.description')}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t('activities.noActivities')}
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const actionType = activity.action_type as ActionType;
                const userName = activity.user 
                  ? `${activity.user?.voornaam} ${activity.user?.achternaam}`
                  : t('common.unknown');

                return (
                  <div 
                    key={activity.id} 
                    className="flex gap-3 pb-4 border-b border-border last:border-0"
                  >
                    <div className={`p-2 rounded-full h-fit ${actionColors[actionType] || 'bg-muted'}`}>
                      {actionIcons[actionType] || <Edit className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {t(actionTypeLabels[actionType]) || actionType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t('activities.by')} {userName}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(activity.created_at), 'dd MMM HH:mm', { locale: dateLocale })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
