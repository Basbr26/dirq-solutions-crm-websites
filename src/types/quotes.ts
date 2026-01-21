/**
 * Quotes Module Types
 * For managing sales quotes and proposals
 */

import type { QuoteStatus } from './crm';

// Re-export for convenience
export type { QuoteStatus } from './crm';

export interface Quote {
  id: string;
  company_id: string;
  contact_id?: string;
  project_id?: string;
  quote_number: string;
  title: string;
  description?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: QuoteStatus;
  valid_until?: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  payment_terms?: string;
  delivery_time?: string;
  owner_id: string;
  notes?: string;
  client_notes?: string;
  created_at: string;
  updated_at: string;
  
  // E-Sign fields
  sign_token?: string;
  sign_status?: string;
  sign_link_expires_at?: string;
  signer_email?: string;
  signature_data?: string;
  signed_at?: string;
  signed_by_name?: string;
  signer_ip_address?: string;
  signer_user_agent?: string;
  
  // Relations (from joins)
  company?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    position?: string;
  };
  project?: {
    id: string;
    title: string;
    stage?: string;
  };
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  
  // Legacy aliases for backward compatibility
  companies?: {
    id: string;
    name: string;
  };
  contacts?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  item_order: number;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
  created_at: string;
}

// Removed duplicate: Use QuoteStatus from @/types/crm

export interface CreateQuoteInput {
  company_id: string;
  contact_id?: string;
  project_id?: string;
  title: string;
  description?: string;
  tax_rate?: number;
  valid_until?: string;
  payment_terms?: string;
  delivery_time?: string;
  notes?: string;
  items: CreateQuoteItemInput[];
}

export interface CreateQuoteItemInput {
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  category?: string;
  item_order?: number;
}

export interface UpdateQuoteInput {
  title?: string;
  description?: string;
  tax_rate?: number;
  valid_until?: string;
  payment_terms?: string;
  delivery_time?: string;
  notes?: string;
  client_notes?: string;
  status?: QuoteStatus;
}

export interface QuoteFilters {
  status?: QuoteStatus;
  company_id?: string;
  owner_id?: string;
  search?: string;
}

export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  total_value: number;
  avg_value: number;
}
