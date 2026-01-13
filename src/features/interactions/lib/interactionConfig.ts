/**
 * Interaction Type Configuration
 * Shared configuration voor interaction types
 */

import {
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Calendar,
  MessageSquare,
  Presentation,
  Mailbox,
  Video,
} from 'lucide-react';

export const interactionConfig = {
  call: {
    icon: Phone,
    label: 'Telefoongesprek',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  email: {
    icon: Mail,
    label: 'E-mail',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  meeting: {
    icon: Users,
    label: 'Vergadering',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  note: {
    icon: FileText,
    label: 'Notitie',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  task: {
    icon: CheckSquare,
    label: 'Taak',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  demo: {
    icon: Presentation,
    label: 'Demo',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  requirement_discussion: {
    icon: MessageSquare,
    label: 'Requirements Bespreking',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  quote_presentation: {
    icon: Presentation,
    label: 'Quote Presentatie',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  physical_mail: {
    icon: Mailbox,
    label: 'Fysiek Kaartje',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  linkedin_video_audit: {
    icon: Video,
    label: 'LinkedIn Video Audit',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
} as const;

// Default fallback voor unknown types
export const getInteractionConfig = (type: string) => {
  return interactionConfig[type as keyof typeof interactionConfig] || {
    icon: FileText,
    label: type,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  };
};
