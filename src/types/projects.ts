/**
 * Projects Module Types
 * For managing website development projects and pipeline
 */

export interface Project {
  id: string;
  company_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  
  // Project specifics
  project_type?: ProjectType;
  website_url?: string;
  number_of_pages?: number;
  features?: string[];
  hosting_included?: boolean;
  maintenance_contract?: boolean;
  launch_date?: string;
  
  // Sales pipeline
  stage: ProjectStage;
  value: number;
  probability: number;
  expected_close_date?: string;
  
  // v2.0 Finance fields
  package_id?: 'finance_starter' | 'finance_growth';
  selected_addons?: ('addon_logo' | 'addon_rush' | 'addon_page')[];
  calculated_total?: number;
  monthly_recurring_revenue?: number;
  intake_status?: {
    logo_received?: boolean;
    colors_approved?: boolean;
    texts_received?: boolean;
    nba_check_complete?: boolean;
  };
  dns_status?: 'pending' | 'active' | 'failed' | 'propagated';
  hosting_provider?: string;
  
  // v2.0.3 Upsell tracking
  upsell_opportunities?: string[]; // e.g., ['SEO pakket', 'Logo design', 'Extra pagina']
  
  // Ownership
  owner_id: string;
  
  // Metadata
  source?: string;
  notes?: string;
  tags?: string[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations (from joins)
  companies?: {
    id: string;
    name: string;
  };
  contacts?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
}

export type ProjectType = 
  | 'landing_page'
  | 'corporate_website'
  | 'ecommerce'
  | 'web_app'
  | 'blog'
  | 'portfolio'
  | 'custom'
  | 'ai_automation'; // n8n workflows, Zapier, AI assistenten

export type ProjectStage = 
  | 'lead'              // Initial interest
  | 'quote_requested'   // Client asked for quote
  | 'quote_sent'        // Quote/proposal sent
  | 'negotiation'       // Discussing terms
  | 'quote_signed'      // Contract signed, ready to start
  | 'in_development'    // Website being built
  | 'review'            // Client reviewing/testing
  | 'live'              // Website is live
  | 'maintenance'       // Ongoing maintenance
  | 'lost';             // Deal lost

export const projectStageConfig: Record<ProjectStage, { 
  label: string; 
  color: string;
  icon: string;
}> = {
  lead: { label: 'Lead', color: '#6B7280', icon: '👋' },
  quote_requested: { label: 'Quote Requested', color: '#3B82F6', icon: '📋' },
  quote_sent: { label: 'Quote Sent', color: '#8B5CF6', icon: '📨' },
  negotiation: { label: 'Negotiation', color: '#F59E0B', icon: '🤝' },
  quote_signed: { label: 'Signed', color: '#10B981', icon: '✅' },
  in_development: { label: 'In Development', color: '#06B6D4', icon: '🔨' },
  review: { label: 'Review', color: '#EC4899', icon: '👀' },
  live: { label: 'Live', color: '#22C55E', icon: '🚀' },
  maintenance: { label: 'Maintenance', color: '#14B8A6', icon: '🔧' },
  lost: { label: 'Lost', color: '#EF4444', icon: '❌' },
};

export interface CreateProjectInput {
  company_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  project_type?: ProjectType;
  value: number;
  expected_close_date?: string;
  notes?: string;
  // v2.0 Finance fields
  package_id?: 'finance_starter' | 'finance_growth';
  selected_addons?: ('addon_logo' | 'addon_rush' | 'addon_page')[];
  monthly_recurring_revenue?: number;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  project_type?: ProjectType;
  website_url?: string;
  number_of_pages?: number;
  features?: string[];
  hosting_included?: boolean;
  maintenance_contract?: boolean;
  launch_date?: string;
  stage?: ProjectStage;
  value?: number;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  upsell_opportunities?: string[];
}

export interface ProjectFilters {
  stage?: ProjectStage;
  project_type?: ProjectType;
  owner_id?: string;
  company_id?: string;
  search?: string;
}

// Advanced multi-dimensional filtering
export interface AdvancedProjectFilters extends ProjectFilters {
  stages?: ProjectStage[];          // Multiple stages at once
  value_min?: number;                // Minimum deal value
  value_max?: number;                // Maximum deal value
  created_after?: string;            // ISO date string
  created_before?: string;           // ISO date string
  expected_close_after?: string;     // Filter by expected close date
  expected_close_before?: string;    // Filter by expected close date
  probability_min?: number;          // Minimum probability (0-100)
  probability_max?: number;          // Maximum probability (0-100)
  project_types?: ProjectType[];     // Multiple project types
  owner_ids?: string[];              // Multiple owners
}

export interface PipelineStats {
  total_projects: number;
  total_value: number;
  weighted_value: number;
  avg_deal_size: number;
  by_stage: Record<ProjectStage, { count: number; value: number }>;
}
