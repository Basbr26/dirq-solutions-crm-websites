/**
 * Type Definitions for Prospect Ingestion API
 * Used by n8n, Apollo.io, KVK, and Manus AI integrations
 */

export type ProspectSource = 
  | 'n8n_automation' 
  | 'Apollo' 
  | 'KVK' 
  | 'Manual' 
  | 'Manus'
  | 'Website';

export interface IngestProspectRequest {
  company_name: string;
  kvk_number: string;
  email?: string;
  phone?: string;
  city?: string;
  linkedin_url?: string;
  website_url?: string;
  source: ProspectSource;
  tech_stack?: string[];
  ai_audit_summary?: string;
}

export interface IngestProspectResponse {
  success: boolean;
  action: 'created' | 'updated';
  company_id?: string;
  message: string;
  metadata?: {
    kvk_number: string;
    source: string;
    timestamp: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}
