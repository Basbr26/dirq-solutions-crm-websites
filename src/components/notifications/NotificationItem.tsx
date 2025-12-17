/**
 * Notification Item Component
 * Individual notification with actions and priority indication
 */

import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Notification, NotificationPriority } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onAction,
}: NotificationItemProps) {
  const navigate = useNavigate();

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'normal':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    const variants: Record<NotificationPriority, string> = {
      critical: 'bg-red-100 text-red-900 border-red-200',
      urgent: 'bg-orange-100 text-orange-900 border-orange-200',
      high: 'bg-yellow-100 text-yellow-900 border-yellow-200',
      normal: 'bg-blue-100 text-blue-900 border-blue-200',
      low: 'bg-gray-100 text-gray-900 border-gray-200',
    };

    return variants[priority];
  };

  const handleClick = () => {
    if (!notification.read_at) {
      onMarkAsRead(notification.id);
    }

    if (notification.deep_link) {
      navigate(notification.deep_link);
    }
  };

  const handleActionClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(notification.id, action);

    // Navigate if action has URL
    const actionConfig = notification.actions.find((a) => a.action === action);
    if (actionConfig?.url) {
      navigate(actionConfig.url);
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg cursor-pointer transition-all hover:bg-muted/50',
        !notification.read_at && 'bg-blue-50 dark:bg-blue-950/20',
        notification.priority === 'critical' && 'border-l-4 border-red-600',
        notification.priority === 'urgent' && 'border-l-4 border-orange-600'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Priority Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getPriorityIcon(notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm leading-tight">
                {notification.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.message}
              </p>
            </div>
            
            {!notification.read_at && (
              <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-xs', getPriorityBadge(notification.priority))}
            >
              {notification.priority}
            </Badge>

            {notification.type && (
              <Badge variant="secondary" className="text-xs">
                {notification.type}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: nl,
              })}
            </span>
          </div>

          {/* Digest Items */}
          {notification.is_digest && notification.digest_items && (
            <div className="mt-2 space-y-1">
              {notification.digest_items.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="text-xs text-muted-foreground pl-2 border-l-2 border-muted"
                >
                  {item.title}
                  {item.count && item.count > 1 && ` (${item.count})`}
                </div>
              ))}
              {notification.digest_items.length > 3 && (
                <div className="text-xs text-muted-foreground pl-2">
                  +{notification.digest_items.length - 3} meer
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={(e) => handleActionClick(action.action, e)}
                  className="text-xs h-8"
                >
                  {action.label}
                </Button>
              ))}
              
              {notification.deep_link && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClick}
                  className="text-xs h-8 ml-auto"
                >
                  Bekijken
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          )}

          {/* Escalation indicator */}
          {notification.is_escalated && (
            <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
              <AlertTriangle className="h-3 w-3" />
              Geëscaleerd (niveau {notification.escalation_level})
            </div>
          )}

          {/* Status indicator */}
          {notification.acted_at && (
            <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
              <CheckCircle2 className="h-3 w-3" />
              Actie ondernomen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
