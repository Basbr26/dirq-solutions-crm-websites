/**
 * Notification Types Configuration
 * Shared constants for notification types and preferences
 */

export interface NotificationTypeConfig {
  value: string;
  label: string;
  description: string;
}

/**
 * Available notification types
 */
export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  { 
    value: 'deadline', 
    label: 'Deadlines & Verlopen', 
    description: 'Taken en offertes die verlopen zijn' 
  },
  { 
    value: 'approval', 
    label: 'Goedkeuringen', 
    description: 'Quote acceptaties en belangrijke beslissingen' 
  },
  { 
    value: 'update', 
    label: 'Updates', 
    description: 'Status wijzigingen van leads, projecten en bedrijven' 
  },
  { 
    value: 'reminder', 
    label: 'Herinneringen', 
    description: 'Aankomende afspraken en taken' 
  },
  { 
    value: 'escalation', 
    label: 'Escalaties', 
    description: 'Urgente zaken die aandacht vereisen' 
  },
  { 
    value: 'digest', 
    label: 'Samenvattingen', 
    description: 'Dagelijkse of wekelijkse overzichten' 
  },
];

/**
 * Default enabled notification types
 */
export const DEFAULT_ENABLED_NOTIFICATION_TYPES = [
  'deadline',
  'approval',
  'update',
  'reminder',
  'escalation',
  'digest',
];

/**
 * Digest frequency options
 */
export type DigestFrequency = 'hourly' | 'daily' | 'weekly';

export const DIGEST_FREQUENCIES: { value: DigestFrequency; label: string }[] = [
  { value: 'hourly', label: 'Elk uur' },
  { value: 'daily', label: 'Dagelijks' },
  { value: 'weekly', label: 'Wekelijks' },
];
