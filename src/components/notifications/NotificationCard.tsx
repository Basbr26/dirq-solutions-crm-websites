import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, Zap, ChevronRight, X, Bell, Mail, MessageSquare } from 'lucide-react';
import type { Notification } from '@/lib/notifications/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface NotificationCardProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onDelete?: (id: string) => void;
  onSnooze?: (id: string) => void;
  isSelected?: boolean;
}

const getPriorityConfig = (priority: string, t: any) => {
  const configs = {
    critical: {
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgLight: 'bg-red-50',
      icon: <AlertCircle className="w-4 h-4" />,
      label: t('notifications.priority.critical')
    },
    high: {
      color: 'bg-orange-500',
      textColor: 'text-orange-700',
      bgLight: 'bg-orange-50',
      icon: <Zap className="w-4 h-4" />,
      label: t('notifications.priority.high')
    },
    normal: {
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgLight: 'bg-blue-50',
      icon: <Bell className="w-4 h-4" />,
      label: t('notifications.priority.normal')
    },
    low: {
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgLight: 'bg-gray-50',
      icon: <Clock className="w-4 h-4" />,
      label: t('notifications.priority.low')
    }
  };
  return configs[priority as keyof typeof configs] || configs.normal;
};

const channelIcons: Record<string, React.ReactNode> = {
  in_app: <Bell className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  sms: <MessageSquare className="w-3 h-3" />,
  push: <Zap className="w-3 h-3" />
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onRead,
  onAction,
  onDelete,
  onSnooze,
  isSelected = false
}) => {
  const { t } = useTranslation();
  const priority = (notification.priority || 'normal') as keyof typeof priorityConfig;
  const config = getPriorityConfig(priority, t);

  const handleCardClick = () => {
    if (!notification.read && onRead) {
      onRead(notification.id);
    }
  };

  const handleActionClick = (actionType: string) => {
    if (onAction) {
      onAction(notification.id, actionType);
    }
  };

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all border-l-4 hover:shadow-md',
        isSelected ? 'ring-2 ring-blue-500' : '',
        !notification.read ? `${config.bgLight} border-l-${config.color.split('-')[1]}-500` : 'border-l-transparent',
        (notification.priority === 'critical') && !notification.read && 'ring-1 ring-red-200'
      )}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        {/* Priority Icon */}
        <div className={cn('flex-shrink-0 p-2 rounded-lg', config.bgLight)}>
          <div className={config.textColor}>{config.icon}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {notification.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.body}
              </p>
            </div>

            {!notification.read && (
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>

            {notification.channels && notification.channels.length > 0 && (
              <div className="flex gap-1">
                {notification.channels.map((channel) => (
                  <div
                    key={channel}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 rounded text-gray-600"
                    title={channel}
                  >
                    {channelIcons[channel] || <Bell className="w-3 h-3" />}
                  </div>
                ))}
              </div>
            )}

            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={action.style === 'primary' ? 'default' : action.style === 'destructive' ? 'destructive' : 'outline'}
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(action.type);
                  }}
                >
                  {action.label}
                  {action.type === 'view' && <ChevronRight className="w-3 h-3 ml-1" />}
                </Button>
              ))}
            </div>
          )}

          {/* Deep Link */}
          {notification.deep_link && !notification.actions?.length && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs h-auto p-0 text-blue-600 hover:text-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                window.location.hash = notification.deep_link;
              }}
            >
              {t('notifications.viewDetails')} <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex-shrink-0 flex gap-1">
          {notification.actioned && (
            <div className="text-green-600" title={t('notifications.actioned')}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title={t('notifications.snooze')}
            onClick={(e) => {
              e.stopPropagation();
              if (onSnooze) onSnooze(notification.id);
            }}
          >
            <Clock className="w-4 h-4 text-gray-500" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title={t('common.delete')}
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(notification.id);
            }}
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
