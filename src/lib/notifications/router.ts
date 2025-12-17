/**
 * Notification Router
 * Smart channel routing based on priority, preferences, and context
 */

import { supabase } from '@/integrations/supabase/client';
import { safeRpc } from '@/lib/supabaseTypeHelpers';
import type {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationPreferences,
  CreateNotificationParams,
} from '@/types/notifications';

export class NotificationRouter {
  /**
   * Create and route notification intelligently
   */
  static async createNotification(params: CreateNotificationParams): Promise<string | null> {
    try {
      const { data, error } = await safeRpc(supabase, 'create_notification', {
        p_user_id: params.user_id,
        p_title: params.title,
        p_message: params.message,
        p_type: params.type,
        p_metadata: params.metadata || {},
        p_deadline: params.deadline || null,
        p_actions: params.actions || [],
        p_deep_link: params.deep_link || null,
      });

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating notification:', error);
      return null;
    }
  }

  /**
   * Batch create notifications with smart grouping
   */
  static async batchCreateNotifications(
    notifications: CreateNotificationParams[],
    options?: {
      combineSimilar?: boolean;
      maxDelayMinutes?: number;
    }
  ): Promise<string[]> {
    const created: string[] = [];

    // Group by user and type if combining similar
    if (options?.combineSimilar) {
      const grouped = this.groupNotifications(notifications);
      
      for (const group of grouped) {
        if (group.notifications.length === 1) {
          const id = await this.createNotification(group.notifications[0]);
          if (id) created.push(id);
        } else {
          const id = await this.createDigest(group);
          if (id) created.push(id);
        }
      }
    } else {
      // Create individually
      for (const notif of notifications) {
        const id = await this.createNotification(notif);
        if (id) created.push(id);
      }
    }

    return created;
  }

  /**
   * Group similar notifications for digest
   */
  private static groupNotifications(
    notifications: CreateNotificationParams[]
  ): Array<{
    user_id: string;
    type: NotificationType;
    notifications: CreateNotificationParams[];
  }> {
    const groups = new Map<string, CreateNotificationParams[]>();

    for (const notif of notifications) {
      const key = `${notif.user_id}-${notif.type}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(notif);
    }

    return Array.from(groups.entries()).map(([key, notifs]) => ({
      user_id: notifs[0].user_id,
      type: notifs[0].type,
      notifications: notifs,
    }));
  }

  /**
   * Create digest notification
   */
  private static async createDigest(group: {
    user_id: string;
    type: NotificationType;
    notifications: CreateNotificationParams[];
  }): Promise<string | null> {
    const count = group.notifications.length;
    const typeName = this.getTypeDisplayName(group.type);

    const { data, error } = await safeFrom(supabase, 'notifications')
      .insert({
        user_id: group.user_id,
        title: `${count} nieuwe ${typeName}`,
        message: group.notifications.map((n) => `• ${n.title}`).join('\n'),
        notification_type: 'system',
      } as never)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating digest:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(
    userId: string
  ): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      return null;
    }

    // Return default preferences if none exist
    if (!data) {
      return this.getDefaultPreferences(userId);
    }

    return data;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    const { error } = await safeFrom(supabase, 'notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      });

    if (error) {
      console.error('Error updating preferences:', error);
      return false;
    }

    return true;
  }

  /**
   * Check if within quiet hours
   */
  static isQuietHours(preferences: NotificationPreferences): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const start = preferences.quiet_hours_start;
    const end = preferences.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 20:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Check if weekend mode applies
   */
  static isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Determine effective recipient (considering delegation)
   */
  static async getEffectiveRecipient(userId: string): Promise<string> {
    const prefs = await this.getUserPreferences(userId);

    if (prefs?.vacation_mode && prefs.vacation_delegate) {
      return prefs.vacation_delegate;
    }

    return userId;
  }

  /**
   * Get channels for notification based on context
   */
  static getChannelsForNotification(
    type: NotificationType,
    priority: NotificationPriority,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    // Priority-based routing takes precedence
    if (priority === 'critical' || priority === 'urgent') {
      return preferences.urgent_channels;
    }

    if (priority === 'high') {
      return preferences.high_channels;
    }

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      // Only critical notifications during quiet hours
      if (priority === 'critical') {
        return ['in_app', 'push'];
      }
      return ['in_app']; // Queue others for later
    }

    // Weekend mode
    if (this.isWeekend() && preferences.weekend_mode) {
      // Only urgent+ notifications on weekends
      if (priority === 'urgent' || priority === 'critical') {
        return preferences.urgent_channels;
      }
      return ['in_app'];
    }

    // Type-based routing
    switch (type) {
      case 'deadline':
        return preferences.deadline_channels;
      case 'approval':
        return preferences.approval_channels;
      case 'update':
        return preferences.update_channels;
      case 'reminder':
        return preferences.reminder_channels;
      case 'escalation':
        return preferences.escalation_channels;
      default:
        return priority === 'normal'
          ? preferences.normal_channels
          : preferences.low_channels;
    }
  }

  /**
   * Get default preferences
   */
  private static getDefaultPreferences(
    userId: string
  ): NotificationPreferences {
    return {
      id: '',
      user_id: userId,
      digest_frequency: 'instant',
      quiet_hours_start: '20:00',
      quiet_hours_end: '08:00',
      weekend_mode: false,
      vacation_mode: false,
      deadline_channels: ['in_app', 'email'],
      approval_channels: ['in_app', 'email', 'push'],
      update_channels: ['in_app'],
      reminder_channels: ['in_app', 'email'],
      escalation_channels: ['in_app', 'email', 'sms', 'push'],
      urgent_channels: ['in_app', 'email', 'sms', 'push'],
      high_channels: ['in_app', 'email', 'push'],
      normal_channels: ['in_app', 'email'],
      low_channels: ['in_app'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get display name for notification type
   */
  private static getTypeDisplayName(type: NotificationType): string {
    const names: Record<NotificationType, string> = {
      deadline: 'deadlines',
      approval: 'goedkeuringsverzoeken',
      update: 'updates',
      reminder: 'herinneringen',
      escalation: 'escalaties',
      digest: 'samenvattingen',
    };

    return names[type] || type;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await safeRpc(supabase, 'mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error('Error marking as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark notification as acted upon
   */
  static async markAsActed(notificationId: string): Promise<boolean> {
    const { error } = await safeRpc(supabase, 'mark_notification_acted', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error('Error marking as acted:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await safeFrom(supabase, 'notifications')
      .update({ is_read: true } as never)
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error marking all as read:', error);
      return false;
    }

    return true;
  }
}
