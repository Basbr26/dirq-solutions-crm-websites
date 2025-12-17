/**
 * Notification System Types
 * Smart batching, routing, escalation, and priority scoring
 */

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export type NotificationType = 
  | 'deadline'
  | 'approval'
  | 'update'
  | 'reminder'
  | 'escalation'
  | 'digest';

export type NotificationStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'acted'
  | 'failed';

export type DigestFrequency = 'instant' | 'hourly' | 'daily' | 'weekly';

export interface NotificationAction {
  label: string;
  action: string; // 'approve', 'reject', 'view', 'complete', etc.
  url?: string;
  variant?: 'default' | 'primary' | 'destructive';
}

export interface Notification {
  id: string;
  user_id: string;
  
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  priority_score: number; // 0-100
  
  metadata: Record<string, unknown>;
  related_entity_type?: string;
  related_entity_id?: string;
  
  actions: NotificationAction[];
  deep_link?: string;
  
  channels: NotificationChannel[];
  status: NotificationStatus;
  
  scheduled_for: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  acted_at?: string;
  expires_at?: string;
  
  batch_id?: string;
  is_digest: boolean;
  digest_items?: DigestItem[];
  
  is_escalated: boolean;
  escalated_from?: string;
  escalation_level: number;
  
  created_at: string;
  updated_at: string;
}

export interface DigestItem {
  type: NotificationType;
  title: string;
  count?: number;
  deep_link?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  
  digest_frequency: DigestFrequency;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_mode: boolean;
  vacation_mode: boolean;
  vacation_delegate?: string;
  
  deadline_channels: NotificationChannel[];
  approval_channels: NotificationChannel[];
  update_channels: NotificationChannel[];
  reminder_channels: NotificationChannel[];
  escalation_channels: NotificationChannel[];
  
  urgent_channels: NotificationChannel[];
  high_channels: NotificationChannel[];
  normal_channels: NotificationChannel[];
  low_channels: NotificationChannel[];
  
  created_at: string;
  updated_at: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  
  entity_type: string;
  trigger_event: string;
  delay_hours: number;
  
  escalation_chain: EscalationStep[];
  conditions: Record<string, unknown>;
  
  base_priority: NotificationPriority;
  priority_modifiers: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

export interface EscalationStep {
  role: string;
  after_hours: number;
  user_id?: string;
}

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  type: NotificationType;
  
  in_app_template?: string;
  email_subject?: string;
  email_body_html?: string;
  email_body_text?: string;
  sms_template?: string;
  push_title?: string;
  push_body?: string;
  
  variables: string[];
  
  default_priority: NotificationPriority;
  default_channels: NotificationChannel[];
  
  active: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface EscalationHistory {
  id: string;
  notification_id: string;
  rule_id?: string;
  
  from_user_id?: string;
  to_user_id: string;
  
  escalation_level: number;
  reason: string;
  
  created_at: string;
}

export interface CreateNotificationParams {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  deadline?: string;
  actions?: NotificationAction[];
  deep_link?: string;
}

export interface NotificationQueueItem {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  attempts: number;
  max_attempts: number;
  error_message?: string;
  scheduled_for: string;
  processed_at?: string;
  created_at: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_priority: Record<NotificationPriority, number>;
  by_type: Record<NotificationType, number>;
}

export interface BatchNotificationRequest {
  notifications: CreateNotificationParams[];
  batch_settings?: {
    combine_similar?: boolean;
    max_delay_minutes?: number;
  };
}

export interface PriorityScoreFactors {
  base_type_score: number;
  deadline_modifier: number;
  role_modifier: number;
  critical_flag: number;
  legal_compliance: number;
  total: number;
}
