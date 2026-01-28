/**
 * Interaction Types Configuration
 * Shared constants for interaction types with icons and colors
 */

import type { LucideIcon } from 'lucide-react';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Presentation,
  Mailbox,
  Video,
} from 'lucide-react';

export type InteractionTypeValue =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'task'
  | 'demo'
  | 'physical_mail'
  | 'linkedin_video_audit';

export interface InteractionTypeConfig {
  value: InteractionTypeValue;
  label: string;
  icon: LucideIcon;
  color: string;
}

/**
 * Get translated interaction types configuration
 * @param t - i18n translation function
 */
export function getInteractionTypes(t: (key: string) => string): InteractionTypeConfig[] {
  return [
    { value: 'call', label: t('interactions.types.call'), icon: Phone, color: 'text-blue-500' },
    { value: 'email', label: t('interactions.types.email'), icon: Mail, color: 'text-purple-500' },
    { value: 'meeting', label: t('interactions.types.meeting'), icon: Calendar, color: 'text-green-500' },
    { value: 'note', label: t('interactions.types.note'), icon: FileText, color: 'text-gray-500' },
    { value: 'task', label: t('interactions.types.task'), icon: CheckSquare, color: 'text-orange-500' },
    { value: 'demo', label: t('interactions.types.demo'), icon: Presentation, color: 'text-teal-500' },
    { value: 'physical_mail', label: t('interactions.physicalMail'), icon: Mailbox, color: 'text-pink-500' },
    { value: 'linkedin_video_audit', label: t('interactions.linkedinVideoAudit'), icon: Video, color: 'text-red-500' },
  ];
}

/**
 * Get icon for interaction type
 */
export function getInteractionIcon(type: InteractionTypeValue): LucideIcon {
  const iconMap: Record<InteractionTypeValue, LucideIcon> = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    note: FileText,
    task: CheckSquare,
    demo: Presentation,
    physical_mail: Mailbox,
    linkedin_video_audit: Video,
  };
  return iconMap[type];
}

/**
 * Get color class for interaction type
 */
export function getInteractionColor(type: InteractionTypeValue): string {
  const colorMap: Record<InteractionTypeValue, string> = {
    call: 'text-blue-500',
    email: 'text-purple-500',
    meeting: 'text-green-500',
    note: 'text-gray-500',
    task: 'text-orange-500',
    demo: 'text-teal-500',
    physical_mail: 'text-pink-500',
    linkedin_video_audit: 'text-red-500',
  };
  return colorMap[type];
}
