/**
 * Channel Selector
 * Intelligently route notifications to appropriate channels
 */

import type { Notification, NotificationChannel, NotificationPreferences } from './types';

export interface RoutingRule {
  priority: 'critical' | 'high' | 'normal' | 'low';
  deadline_hours?: number;
  default_channels: NotificationChannel[];
  retry?: {
    after_minutes: number;
    channels: NotificationChannel[];
  };
}

const routingRules: RoutingRule[] = [
  {
    priority: 'critical',
    deadline_hours: 24,
    default_channels: ['in_app', 'email', 'sms', 'push'],
    retry: {
      after_minutes: 120,
      channels: ['sms', 'email']
    }
  },
  {
    priority: 'high',
    deadline_hours: 72,
    default_channels: ['in_app', 'email', 'push']
  },
  {
    priority: 'normal',
    default_channels: ['in_app', 'email']
  },
  {
    priority: 'low',
    default_channels: ['in_app']
  }
];

/**
 * Select which channels to use for a notification
 */
export const selectChannels = (
  notification: Notification,
  preferences: NotificationPreferences | null,
  userStatus?: { vacation: boolean; delegate_id?: string }
): NotificationChannel[] => {
  // No preferences? Use safe defaults
  if (!preferences) {
    const rule = routingRules.find(r => r.priority === notification.priority) || routingRules[2];
    return rule.default_channels;
  }

  // Critical always goes through
  if (notification.priority === 'critical') {
    return ['in_app', 'email', 'sms'];
  }

  // Check vacation mode
  if (userStatus?.vacation && userStatus?.delegate_id) {
    // Don't send during vacation (delegate handles)
    return [];
  }

  // Check quiet hours
  if (isInQuietHours(preferences)) {
    // Only critical/high go through quiet hours
    return (notification.priority as string) === 'critical' ? ['in_app', 'email'] : [];
  }

  // Check channel preferences
  const enabledChannels = Object.entries(preferences.channels)
    .filter(([_, config]: [string, unknown]) => (config as Record<string, unknown>).enabled)
    .map(([channel]) => channel as NotificationChannel);

  // Filter to channels that support this notification type
  return enabledChannels.filter(channel => {
    const config = preferences.channels[channel as keyof typeof preferences.channels];
    if (typeof config === 'object' && 'types' in config) {
      const types = (config as Record<string, unknown>).types as string[];
      return types.includes(notification.type) || types.includes('all');
    }
    return true;
  });
};

/**
 * Check if current time is within quiet hours
 */
const isInQuietHours = (preferences: NotificationPreferences): boolean => {
  if (!preferences.quiet_hours.enabled) {
    return false;
  }

  const now = new Date();
  const [startHour, startMin] = preferences.quiet_hours.start.split(':').map(Number);
  const [endHour, endMin] = preferences.quiet_hours.end.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes < endMinutes) {
    // Normal case: quiet hours don't span midnight
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Spans midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

/**
 * Get routing rule for notification
 */
export const getRoutingRule = (notification: Notification): RoutingRule => {
  return routingRules.find(r => r.priority === notification.priority) || routingRules[2];
};

/**
 * Should retry notification
 */
export const shouldRetry = (notification: Notification, failedChannels: NotificationChannel[]): boolean => {
  const rule = getRoutingRule(notification);
  return !!rule.retry && failedChannels.length > 0;
};

/**
 * Get retry channels
 */
export const getRetryChannels = (notification: Notification): NotificationChannel[] => {
  const rule = getRoutingRule(notification);
  return rule.retry?.channels || [];
};

/**
 * Get retry delay in minutes
 */
export const getRetryDelay = (notification: Notification): number => {
  const rule = getRoutingRule(notification);
  return rule.retry?.after_minutes || 0;
};

/**
 * Check if channel is available for user
 */
export const isChannelAvailable = (
  channel: NotificationChannel,
  preferences: NotificationPreferences
): boolean => {
  const config = preferences.channels[channel as keyof typeof preferences.channels];
  if (typeof config === 'object' && 'enabled' in config) {
    return (config as Record<string, unknown>).enabled as boolean;
  }
  return false;
};
