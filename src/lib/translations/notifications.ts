/**
 * Notification Translations (Dutch)
 * Centralized translation object for all notification-related text
 */

import type { NotificationPriority } from '@/types/notifications';

export const notificationText = {
  // General UI
  notifications: 'Notificaties',
  noNotifications: 'Geen notificaties',
  markAllRead: 'Alles gelezen',
  markAsRead: 'Markeer als gelezen',
  newNotification: 'Nieuwe notificatie',
  loading: 'Laden...',
  view: 'Bekijken',
  acted: 'Actie ondernomen',
  escalated: 'Geëscaleerd',
  level: 'niveau',
  
  // Filter tabs
  unread: 'Ongelezen',
  priority: 'Belangrijk',
  all: 'Alle',
  
  // Status messages
  unreadCount: (count: number) => `${count} ongelezen van`,
  noUnread: 'Geen ongelezen notificaties',
  digestMore: (count: number) => `+${count} meer`,
  
  // Toast messages
  markReadSuccess: 'Notificatie gemarkeerd als gelezen',
  markAllReadSuccess: 'Alle notificaties gemarkeerd als gelezen',
  
  // Priority levels
  priorities: {
    critical: 'Kritiek',
    urgent: 'Urgent',
    high: 'Hoog',
    normal: 'Normaal',
    low: 'Laag',
  } as Record<NotificationPriority, string>,
  
  // Notification types
  types: {
    deadline: 'Deadline',
    approval: 'Goedkeuring',
    update: 'Update',
    reminder: 'Herinnering',
    escalation: 'Escalatie',
    digest: 'Overzicht',
    quote_accepted: 'Offerte geaccepteerd',
    quote_rejected: 'Offerte afgewezen',
    lead_assigned: 'Lead toegewezen',
    deal_won: 'Deal gewonnen',
    deal_lost: 'Deal verloren',
    project_stage_changed: 'Project fase gewijzigd',
    contact_created: 'Contact aangemaakt',
    company_created: 'Bedrijf aangemaakt',
    task_assigned: 'Taak toegewezen',
    task_completed: 'Taak voltooid',
    task_overdue: 'Taak te laat',
  } as Record<string, string>,
  
  // Action labels
  actions: {
    approve: 'Goedkeuren',
    reject: 'Afwijzen',
    complete: 'Voltooien',
    view: 'Bekijken',
    dismiss: 'Sluiten',
  },
};

// Helper function to get translated priority
export function getPriorityLabel(priority: NotificationPriority): string {
  return notificationText.priorities[priority] || priority;
}

// Helper function to get translated type
export function getTypeLabel(type: string): string {
  return notificationText.types[type] || type;
}
