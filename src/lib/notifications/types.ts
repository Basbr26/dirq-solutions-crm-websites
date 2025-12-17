/**
 * Notification System Types
 * Complete type definitions for intelligent notifications
 */

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export type NotificationType =
  // Wet Poortwachter deadlines
  | 'poortwachter_week1'
  | 'poortwachter_week6'
  | 'poortwachter_week42'
  | 'poortwachter_deadline_approaching'
  | 'poortwachter_deadline_missed'
  
  // Contract & Certificates
  | 'contract_expiring'
  | 'certificate_expiring'
  | 'contract_renewal_needed'
  
  // Performance & Reviews
  | 'performance_review_due'
  | 'performance_review_scheduled'
  
  // Approvals
  | 'leave_approval_needed'
  | 'overtime_approval_needed'
  | 'document_signature_needed'
  | 'budget_approval_needed'
  | 'expense_approval_needed'
  
  // Case/Task Updates
  | 'case_status_changed'
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  
  // Documents
  | 'document_uploaded'
  | 'document_ready_for_signing'
  
  // Team & Organization
  | 'new_team_member'
  | 'team_member_onboarding'
  | 'team_member_offboarding'
  
  // Reminders
  | 'timesheet_missing'
  | 'meeting_upcoming'
  
  // Social
  | 'birthday_today'
  | 'work_anniversary'
  | 'colleague_achievement'
  
  // System
  | 'system_update'
  | 'maintenance_scheduled';

export interface NotificationAction {
  label: string;
  type: 'approve' | 'deny' | 'view' | 'snooze' | 'complete' | 'custom';
  style: 'primary' | 'default' | 'destructive';
  handler?: () => Promise<void>;
  url?: string; // For email CTAs
}

export interface Notification {
  id: string;
  user_id: string;
  recipient_id?: string; // Legacy alias for user_id
  type: NotificationType;
  title: string;
  body: string;
  message?: string; // Alias for body
  priority: NotificationPriority;
  
  // Entity reference
  related_entity_type?: string; // 'case', 'leave_request', 'task'
  related_entity_id?: string;
  deep_link?: string;
  
  // Status
  read: boolean;
  read_at?: string;
  actioned: boolean;
  actioned_at?: string;
  
  // Delivery
  scheduled_send?: string;
  sent_at?: string;
  channels: NotificationChannel[];
  
  // Actions
  actions?: NotificationAction[];
  
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  
  // Global settings
  digest_preference: 'instant' | 'hourly' | 'daily' | 'weekly';
  
  quiet_hours: {
    enabled: boolean;
    start: string; // '22:00'
    end: string; // '08:00'
  };
  
  vacation_mode: {
    enabled: boolean;
    delegate_to?: string;
    auto_reply: string;
  };
  
  // Per-channel settings
  channels: {
    in_app: {
      enabled: boolean;
      types: NotificationType[];
    };
    email: {
      enabled: boolean;
      types: NotificationType[];
      digest: boolean;
    };
    sms: {
      enabled: boolean;
      types: NotificationType[];
    };
    push: {
      enabled: boolean;
      types: NotificationType[];
    };
  };
  
  // Per-type overrides
  type_overrides?: Partial<Record<NotificationType, {
    channels: NotificationChannel[];
    priority_override?: NotificationPriority;
  }>>;
  
  updated_at: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  
  trigger: {
    type: 'no_response' | 'deadline_approaching' | 'sla_breach';
    after_hours: number;
  };
  
  escalate_to: 'manager' | 'hr_director' | 'c_level';
  notification_type: string;
  action: 'notify' | 'reassign' | 'auto_approve';
}

export interface Escalation {
  id: string;
  task_id: string;
  escalated_from: string;
  escalated_to: string;
  reason: string;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: (data: Record<string, unknown>) => string;
  body: (data: Record<string, unknown>) => string;
  priority: NotificationPriority;
  actions?: NotificationAction[];
  escalate_after_hours?: number;
  channels_default?: NotificationChannel[];
}

export interface DigestItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  deepLink?: string;
  actions?: NotificationAction[];
}

export interface NotificationDigest {
  recipient_id: string;
  sections: {
    title: string;
    items: DigestItem[];
    cta?: string;
  }[];
  scheduled_send: string;
  subject: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_priority: Record<NotificationPriority, number>;
  by_type: Record<NotificationType, number>;
  by_channel: Record<NotificationChannel, number>;
}

export interface NotificationLog {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  recipient: string;
  sent_at: string;
  external_id?: string; // Resend/Twilio ID
  status: NotificationStatus;
  error_message?: string;
}

export interface PriorityScoreFactors {
  base_type_score: number;
  deadline_modifier: number;
  role_modifier: number;
  critical_flag: number;
  legal_compliance: number;
  user_fatigue: number;
  total: number;
}

export interface PriorityScoreResult {
  score: number; // 0-100
  priority: NotificationPriority;
  factors: PriorityScoreFactors;
}
