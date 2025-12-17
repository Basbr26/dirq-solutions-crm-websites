/**
 * Notification Templates
 * Predefined templates for all notification types
 */

import type { NotificationTemplate } from './types';

export const notificationTemplates: Record<string, NotificationTemplate> = {
  poortwachter_week1: {
    type: 'poortwachter_week1',
    title: (data) => `🚨 Wet Poortwachter: Week 1 - Direct contact nodig`,
    body: (data) => 
      `Medewerker ${data.employee_name} is ziek. Neem vandaag contact op om te onderzoeken wat de situatie is.`,
    priority: 'high',
    channels_default: ['in_app', 'email'],
    escalate_after_hours: 24,
    actions: [
      {
        label: 'Contact Log',
        type: 'custom',
        style: 'primary'
      },
      {
        label: 'Bekijk case',
        type: 'view',
        style: 'default'
      }
    ]
  },

  poortwachter_week6: {
    type: 'poortwachter_week6',
    title: (data) => `⚠️ URGENT: Week 6 Probleemanalyse verschuldigd`,
    body: (data) =>
      `Case ${data.case_id}: Probleemanalyse moet vandaag voltooid zijn. Days left: ${data.days_left}`,
    priority: 'critical',
    channels_default: ['in_app', 'email', 'sms'],
    escalate_after_hours: 12,
  },

  poortwachter_week42: {
    type: 'poortwachter_week42',
    title: (data) => `📋 Week 42: Plan van Aanpak Review`,
    body: (data) =>
      `Na 42 weken verzuim: Plan van Aanpak moet geëvalueerd en bijgesteld worden.`,
    priority: 'high',
    channels_default: ['in_app', 'email'],
    escalate_after_hours: 48,
  },

  poortwachter_deadline_approaching: {
    type: 'poortwachter_deadline_approaching',
    title: (data) => `📅 Poortwachter deadline over ${data.days} dagen`,
    body: (data) =>
      `${data.deadline_type} deadline op ${data.deadline_date}. Voorbereiding nu nodig.`,
    priority: 'high',
    channels_default: ['in_app', 'email'],
  },

  poortwachter_deadline_missed: {
    type: 'poortwachter_deadline_missed',
    title: (data) => `🚨 COMPLIANCE: Poortwachter deadline gemist!`,
    body: (data) =>
      `${data.deadline_type} deadline van ${data.deadline_date} is verstreken. Escalatie nodig.`,
    priority: 'critical',
    channels_default: ['in_app', 'email', 'sms'],
  },

  leave_approval_needed: {
    type: 'leave_approval_needed',
    title: (data) => `✈️ Verlofaanvraag ter goedkeuring`,
    body: (data) =>
      `${data.employee_name} vraagt ${data.days} dagen verlof (${data.start_date} - ${data.end_date})`,
    priority: 'normal',
    channels_default: ['in_app', 'email'],
    actions: [
      { label: '✅ Goedkeuren', type: 'approve', style: 'primary' },
      { label: '❌ Afwijzen', type: 'deny', style: 'destructive' },
      { label: '👁️ Details', type: 'view', style: 'default' }
    ]
  },

  task_assigned: {
    type: 'task_assigned',
    title: (data) => `📌 Nieuwe taak: ${(data as { task_title: string }).task_title}`,
    body: (data) => (data as { task_description: string }).task_description,
    priority: 'normal',
    channels_default: ['in_app', 'email'],
  },

  task_overdue: {
    type: 'task_overdue',
    title: (data) => `⏰ Taak verlopen: ${data.task_title}`,
    body: (data) => `Deadline was ${data.due_date}. Status: ${data.days_overdue} dagen te laat`,
    priority: 'high',
    channels_default: ['in_app', 'email'],
  },

  document_signature_needed: {
    type: 'document_signature_needed',
    title: (data) => `✍️ Document ter ondertekening: ${data.document_name}`,
    body: (data) => `Onderteken ${data.document_type} - vereist voor ${data.deadline}`,
    priority: 'high',
    channels_default: ['in_app', 'email'],
    actions: [
      { label: 'Onderteken nu', type: 'custom', style: 'primary' },
      { label: 'Bekijk document', type: 'view', style: 'default' }
    ]
  },

  case_status_changed: {
    type: 'case_status_changed',
    title: (data) => `📊 Case update: ${data.case_id}`,
    body: (data) => `Status gewijzigd naar: ${data.new_status}`,
    priority: 'normal',
    channels_default: ['in_app', 'email'],
  },

  contract_expiring: {
    type: 'contract_expiring',
    title: (data) => `📄 Contract verloopt binnenkort`,
    body: (data) => 
      `Contract van ${data.employee_name} verloopt over ${data.days} dagen (${data.end_date})`,
    priority: 'high',
    channels_default: ['in_app', 'email'],
  },

  new_team_member: {
    type: 'new_team_member',
    title: (data) => `👋 Welkom: ${data.new_member_name}`,
    body: (data) => 
      `${data.new_member_name} begint als ${data.role} in ${data.department}. Startdatum: ${data.start_date}`,
    priority: 'normal',
    channels_default: ['in_app', 'email'],
  },

  birthday_today: {
    type: 'birthday_today',
    title: (data) => `🎉 Vandaag jarig: ${data.employee_name}`,
    body: (data) => `Veel sterkte met je verjaardag!`,
    priority: 'low',
    channels_default: ['in_app'],
  },

  timesheet_missing: {
    type: 'timesheet_missing',
    title: (data) => `⏱️ Urenstaat ontbreekt`,
    body: (data) => `Je urenstaat voor ${data.period} moet ingevuld worden`,
    priority: 'normal',
    channels_default: ['in_app', 'email'],
  },
};

/**
 * Get template for notification type
 */
export const getNotificationTemplate = (type: string): NotificationTemplate | undefined => {
  return notificationTemplates[type];
};

/**
 * Format notification data using template
 */
export const formatNotification = (type: string, data: Record<string, unknown>) => {
  const template = getNotificationTemplate(type);
  
  if (!template) {
    return {
      title: 'Notificatie',
      body: 'Je hebt een update ontvangen'
    };
  }
  
  return {
    title: template.title(data),
    body: template.body(data),
    priority: template.priority,
    actions: template.actions,
    channels: template.channels_default
  };
};
