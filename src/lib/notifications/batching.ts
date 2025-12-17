/**
 * Smart Batching Engine
 * Groups notifications intelligently to reduce fatigue
 */

import type { Notification } from './types';
import { addHours, addDays } from 'date-fns';

export interface NotificationBatch {
  recipient_id: string;
  batch_type: 'instant' | 'hourly' | 'daily' | 'weekly';
  notifications: Notification[];
  scheduled_send: Date;
}

/**
 * Batch notifications based on priority and deadline
 */
export const batchNotifications = (
  notifications: Notification[]
): Map<string, NotificationBatch[]> => {
  const batches = new Map<string, NotificationBatch[]>();

  notifications.forEach((notif) => {
    const recipientBatches = batches.get(notif.recipient_id) || [];
    const batchType = determineBatchType(notif);
    const scheduledSend = calculateScheduledSend(batchType);

    // Find or create batch
    let batch = recipientBatches.find(
      (b) => b.batch_type === batchType && 
             b.notifications[0].recipient_id === notif.recipient_id
    );

    if (!batch) {
      batch = {
        recipient_id: notif.recipient_id,
        batch_type: batchType,
        notifications: [],
        scheduled_send: scheduledSend
      };
      recipientBatches.push(batch);
    }

    batch.notifications.push(notif);
    batches.set(notif.recipient_id, recipientBatches);
  });

  return batches;
};

/**
 * Determine batch type based on priority and deadline
 */
const determineBatchType = (notif: Notification): 'instant' | 'hourly' | 'daily' | 'weekly' => {
  // Critical always goes instant
  if (notif.priority === 'critical') {
    return 'instant';
  }

  // Check if deadline is imminent
  if (notif.deep_link?.includes('deadline')) {
    const hoursUntilDeadline = estimateHoursUntilDeadline(notif);
    
    if (hoursUntilDeadline < 24) {
      return 'instant'; // Send immediately
    } else if (hoursUntilDeadline < 72) {
      return 'hourly'; // Send in next batch
    }
  }

  // Normal and high priority
  if (notif.priority === 'high') {
    return 'hourly';
  }

  // Low priority
  if (notif.priority === 'low') {
    return 'weekly';
  }

  // Default: daily digest
  return 'daily';
};

/**
 * Estimate hours until deadline from notification context
 */
const estimateHoursUntilDeadline = (notif: Notification): number => {
  // Try to extract from body
  const match = notif.body.match(/(\d+)\s*dag/i);
  if (match) {
    return parseInt(match[1]) * 24;
  }
  return 72; // Default
};

/**
 * Calculate when to send batch
 */
const calculateScheduledSend = (batchType: string): Date => {
  const now = new Date();

  switch (batchType) {
    case 'instant':
      return now; // Send immediately
    case 'hourly': {
      return addHours(now, 1); // Send in 1 hour
    }
    case 'daily': {
      // Send at 9 AM tomorrow
      const tomorrow = addDays(now, 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
    case 'weekly': {
      // Send Monday at 9 AM
      const nextMonday = addDays(now, ((1 + 7 - now.getDay()) % 7) || 7);
      nextMonday.setHours(9, 0, 0, 0);
      return nextMonday;
    }
    default:
      return now;
  }
};

/**
 * Format digest email sections
 */
export const formatDigestSections = (notifications: Notification[]) => {
  const grouped = {
    critical: notifications.filter(n => n.priority === 'critical'),
    high: notifications.filter(n => n.priority === 'high'),
    normal: notifications.filter(n => n.priority === 'normal'),
    low: notifications.filter(n => n.priority === 'low')
  };

  const sections = [];

  if (grouped.critical.length > 0) {
    sections.push({
      title: '🚨 Urgent (actie vereist)',
      items: grouped.critical,
      icon: '🔴'
    });
  }

  if (grouped.high.length > 0) {
    sections.push({
      title: '⚠️ Belangrijk',
      items: grouped.high,
      icon: '🟠'
    });
  }

  if (grouped.normal.length > 0) {
    sections.push({
      title: '📬 Updates',
      items: grouped.normal,
      icon: '🟡'
    });
  }

  if (grouped.low.length > 0) {
    sections.push({
      title: '💬 Informatie',
      items: grouped.low,
      icon: '🟢'
    });
  }

  return sections;
};

/**
 * Check if notification should be batched
 */
export const shouldBatch = (
  notification: Notification,
  userPreferences: unknown
): boolean => {
  // Critical notifications never get batched
  if (notification.priority === 'critical') {
    return false;
  }

  // Check user digest preference
  const preference = (userPreferences as Record<string, unknown>)?.['digest_preference'] || 'daily';
  return preference !== 'instant';
};
