/**
 * Document Types Configuration
 * Shared constants for document generation and management
 */

import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Receipt,
  Briefcase,
  Shield,
  MessageSquare,
} from 'lucide-react';

export type DocumentType = 'contract' | 'invoice' | 'proposal' | 'nda' | 'meeting_notes';

export interface DocumentTypeConfig {
  type: DocumentType;
  name: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Available document types for CRM document generator
 */
export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    type: 'contract',
    name: 'Contract',
    description: 'Overeenkomst van opdracht',
    icon: FileText,
  },
  {
    type: 'invoice',
    name: 'Factuur',
    description: 'Professionele factuur',
    icon: Receipt,
  },
  {
    type: 'proposal',
    name: 'Projectvoorstel',
    description: 'Uitgebreid projectvoorstel',
    icon: Briefcase,
  },
  {
    type: 'nda',
    name: 'NDA',
    description: 'Geheimhoudingsovereenkomst',
    icon: Shield,
  },
  {
    type: 'meeting_notes',
    name: 'Gespraksverslag',
    description: 'Meeting notities',
    icon: MessageSquare,
  },
];

/**
 * Conversation types for case management
 */
export interface ConversationTypeConfig {
  value: string;
  label: string;
}

export const CONVERSATION_TYPES: ConversationTypeConfig[] = [
  { value: 'telefonisch', label: 'Telefonisch' },
  { value: 'video', label: 'Videogesprek' },
  { value: 'persoonlijk', label: 'Persoonlijk gesprek' },
  { value: 'email', label: 'Per e-mail' },
  { value: 'whatsapp', label: 'WhatsApp/SMS' },
];

/**
 * Mood options for conversation notes
 */
export const MOOD_OPTIONS: ConversationTypeConfig[] = [
  { value: 'positief', label: '😊 Positief' },
  { value: 'neutraal', label: '😐 Neutraal' },
  { value: 'bezorgd', label: '😟 Bezorgd' },
  { value: 'gestrest', label: '😰 Gestrest' },
  { value: 'gefrustreerd', label: '😤 Gefrustreerd' },
];
