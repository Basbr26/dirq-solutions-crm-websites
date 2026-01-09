// =============================================
// CRM TYPE DEFINITIONS
// Created: January 3, 2026
// Purpose: TypeScript types for CRM entities
// =============================================

// =============================================
// ENUMS & CONSTANTS
// =============================================

export type AppRole = 'ADMIN' | 'SALES' | 'MANAGER' | 'SUPPORT';

export type CompanyStatus = 'prospect' | 'active' | 'inactive' | 'churned';
export type CompanyPriority = 'low' | 'medium' | 'high';
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '501+';

// Website Project Types
export type ProjectType = 
  | 'landing_page' 
  | 'corporate_website' 
  | 'ecommerce' 
  | 'web_app' 
  | 'blog' 
  | 'portfolio' 
  | 'custom';

// Website Sales Funnel Stages
export type ProjectStage = 
  | 'lead'              // Initial interest
  | 'quote_requested'   // Client asked for quote
  | 'quote_sent'        // Quote/proposal sent
  | 'negotiation'       // Discussing terms
  | 'quote_signed'      // Contract signed
  | 'in_development'    // Website being built
  | 'review'            // Client reviewing
  | 'live'              // Website is live
  | 'maintenance'       // Ongoing maintenance
  | 'lost';             // Deal lost

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export type InteractionType = 
  | 'call' 
  | 'email' 
  | 'meeting' 
  | 'note' 
  | 'task' 
  | 'demo'
  | 'requirement_discussion'  // Discussing website requirements
  | 'quote_presentation'      // Presenting quote to client
  | 'review_session'          // Client reviewing website
  | 'training'                // Client training on CMS
  | 'physical_mail'           // Fysiek kaartje/brochure verstuurd
  | 'linkedin_video_audit';   // LinkedIn video audit verstuurd
export type InteractionDirection = 'inbound' | 'outbound';
export type TaskStatus = 'pending' | 'completed' | 'cancelled';

// =============================================
// BASE ENTITIES
// =============================================

export interface Industry {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry_id?: string;
  industry?: Industry; // Joined data
  website?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  company_size?: CompanySize;
  annual_revenue?: number;
  status: CompanyStatus;
  priority: CompanyPriority;
  owner_id: string;
  owner?: Profile; // Joined data
  notes?: string;
  tags?: string[];
  custom_fields?: CustomFields;
  // v2.0 External Data Integration
  kvk_number?: string; // KVK API (8 digits, unique)
  linkedin_url?: string; // Apollo.io
  source?: 'Manual' | 'Apollo' | 'KVK' | 'Website' | 'Manus' | 'n8n_automation'; // Data source
  tech_stack?: string[]; // Apollo.io tech stack
  ai_audit_summary?: string; // Manus AI audit
  video_audit_url?: string; // Manus AI video
  total_mrr?: number; // Calculated MRR (auto-updated by trigger)
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
}

export interface Contact {
  id: string;
  company_id?: string;
  company?: Company; // Joined data
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  linkedin_url?: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  owner_id: string;
  owner?: Profile; // Joined data
  notes?: string;
  tags?: string[];
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
}

// Website Project (renamed from Lead)
export interface Project {
  id: string;
  company_id?: string;
  company?: Company;
  contact_id?: string;
  contact?: Contact;
  title: string;
  description?: string;
  
  // Financial
  value?: number;
  currency: string;
  
  // Website-specific
  project_type?: ProjectType;
  website_url?: string;
  website_builder?: '10web.io' | 'Landingpage.ai';
  number_of_pages?: number;
  features?: string[]; // ['cms', 'seo', 'analytics', 'multilingual', etc.]
  hosting_included: boolean;
  maintenance_contract: boolean;
  launch_date?: string;
  delivery_deadline?: string;
  
  // v2.0 Finance System
  package_id?: 'finance_starter' | 'finance_growth'; // Fixed packages
  selected_addons?: ('addon_logo' | 'addon_rush' | 'addon_page')[]; // Add-ons array
  calculated_total?: number; // Auto-calculated package + addons total
  monthly_recurring_revenue?: number; // MRR for subscription services (e.g., hosting €50/month)
  
  // v2.0 Intake/Onboarding Tracker
  intake_status?: {
    logo_received?: boolean;
    colors_approved?: boolean;
    texts_received?: boolean;
    nba_check_complete?: boolean;
  };
  
  // v2.0 DNS/Hosting
  dns_status?: 'pending' | 'active' | 'propagated'; // DNS workflow status
  hosting_provider?: string; // e.g., "TransIP", "Hostinger"
  
  // Pipeline
  stage: ProjectStage;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  lost_reason?: string;
  won_notes?: string;
  
  // Assignment
  owner_id: string;
  owner?: Profile;
  source?: string;
  tags?: string[];
  custom_fields?: CustomFields;
  
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  company_id: string;
  company?: Company;
  contact_id?: string;
  contact?: Contact;
  project_id?: string;
  project?: Project;
  
  quote_number: string; // e.g., "Q-2026-001"
  title: string;
  description?: string;
  
  // Financial
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  
  // Status
  status: QuoteStatus;
  
  // Dates
  valid_until?: string;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  
  // Terms
  payment_terms?: string;
  delivery_time?: string;
  
  // Owner
  created_by: string;
  creator?: Profile;
  
  // Notes
  notes?: string;
  client_notes?: string;
  
  // Items
  items?: QuoteItem[];
  
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
  is_addon?: boolean; // Voor add-ons zoals Logo design, Extra pagina's, Rush delivery
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

// Standaard Add-on Opties
export const QUOTE_ADDONS = {
  LOGO_DESIGN: { title: 'Logo design', price: 350, description: 'Professioneel logo ontwerp' },
  EXTRA_PAGES: { title: 'Extra pagina\'s', price: 150, description: 'Prijs per extra pagina' },
  RUSH_DELIVERY: { title: 'Rush delivery', price: 300, description: 'Versnelde oplevering binnen 2 weken' },
} as const;

export interface ProjectStats {
  total: number;
  active: number;
  live: number;
  lost: number;
  total_value: number;
  average_value: number;
  win_rate: number;
  by_stage: Record<ProjectStage, number>;
  by_type: Record<ProjectType, number>;
  by_owner: Record<string, number>;
}

export interface PipelineMetrics {
  stage: ProjectStage;
  count: number;
  total_value: number;
  average_probability: number;
  average_age_days: number;
}

export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  total_value: number;
  acceptance_rate: number; // Percentage
  average_quote_value: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  project_type: ProjectType;
  estimated_value?: number;
  estimated_hours?: number;
  default_features?: string[];
  template_items?: any; // JSONB
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  company_id?: string;
  company?: Company; // Joined data
  contact_id?: string;
  contact?: Contact; // Joined data
  project_id?: string;
  project?: Project; // Joined data
  type: InteractionType;
  direction?: InteractionDirection;
  subject: string;
  description?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  completed_at?: string;
  is_task: boolean;
  task_status?: TaskStatus;
  due_date?: string;
  user_id: string;
  user?: Profile; // Joined data
  attachments?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// =============================================
// USER & PROFILE
// =============================================

export interface Profile {
  id: string;
  email: string;
  voornaam: string;
  achternaam: string;
  full_name?: string; // Computed or stored field
  role: AppRole;
  telefoon?: string | null;
  functie?: string | null;
  foto_url?: string | null;
  department_id?: string | null;
  manager_id?: string | null;
  created_at: string;
  updated_at: string;
  must_change_password?: boolean;
}

// =============================================
// STATS & ANALYTICS
// =============================================

export interface CompanyStats {
  total: number;
  active: number;
  prospects: number;
  inactive: number;
  by_industry: Record<string, number>;
  by_owner: Record<string, number>;
}

export interface SalesActivity {
  calls: number;
  emails: number;
  meetings: number;
  tasks_pending: number;
  tasks_completed: number;
}

// =============================================
// FORM TYPES (for create/update)
// =============================================

export interface CompanyFormData {
  name: string;
  industry_id?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  company_size?: CompanySize;
  annual_revenue?: number;
  status: CompanyStatus;
  priority: CompanyPriority;
  notes?: string;
  tags?: string[];
  // v2.0 External Data Integration (optional, can be set via API or manually)
  kvk_number?: string;
  linkedin_url?: string;
  source?: 'Manual' | 'Apollo' | 'KVK' | 'Website' | 'Manus' | 'n8n_automation';
  tech_stack?: string[];
  ai_audit_summary?: string;
  video_audit_url?: string;
}

export interface ContactFormData {
  company_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  linkedin_url?: string;
  is_primary?: boolean;
  is_decision_maker?: boolean;
  notes?: string;
}

export type ContactCreateData = ContactFormData;
export type ContactUpdateData = Partial<ContactFormData>;

export interface ProjectFormData {
  company_id?: string;
  contact_id?: string;
  title: string;
  description?: string;
  value?: number;
  project_type?: ProjectType;
  website_url?: string;
  number_of_pages?: number;
  features?: string[];
  hosting_included?: boolean;
  maintenance_contract?: boolean;
  launch_date?: string;
  stage: ProjectStage;
  probability: number;
  expected_close_date?: string;
  source?: string;
  tags?: string[];
}

export interface QuoteFormData {
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
}

export interface QuoteItemFormData {
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  category?: string;
}

export interface ProjectFilters {
  search?: string;
  stage?: ProjectStage[];
  project_type?: ProjectType[];
  owner_id?: string[];
  company_id?: string[];
  value_min?: number;
  value_max?: number;
  expected_close_date_from?: string;
  expected_close_date_to?: string;
  hosting_included?: boolean;
  maintenance_contract?: boolean;
}

export interface QuoteFilters {
  search?: string;
  status?: QuoteStatus[];
  company_id?: string[];
  created_by?: string[];
  date_from?: string;
  date_to?: string;
}

export interface InteractionFormData {
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  type: InteractionType;
  direction?: InteractionDirection;
  subject: string;
  description?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  is_task?: boolean;
  due_date?: string;
  tags?: string[];
}

// =============================================
// FILTER TYPES
// =============================================

export interface CompanyFilters {
  search?: string;
  status?: CompanyStatus[];
  industry_id?: string[];
  owner_id?: string[];
  priority?: CompanyPriority[];
}

// Advanced multi-dimensional filtering for companies
export interface AdvancedCompanyFilters extends CompanyFilters {
  created_after?: string;            // ISO date string
  created_before?: string;           // ISO date string
  last_contact_after?: string;       // Last contact date filter
  last_contact_before?: string;      // Last contact date filter
  revenue_min?: number;              // Minimum annual revenue
  revenue_max?: number;              // Maximum annual revenue
  company_sizes?: CompanySize[];     // Multiple company sizes
  tags?: string[];                   // Filter by tags
}

export interface InteractionFilters {
  type?: InteractionType[];
  company_id?: string[];
  contact_id?: string[];
  project_id?: string[];
  user_id?: string[];
  date_from?: string;
  date_to?: string;
  is_task?: boolean;
  task_status?: TaskStatus[];
}

// =============================================
// UI HELPER TYPES
// =============================================

export interface SelectOption {
  label: string;
  value: string;
}

export interface KanbanColumn {
  id: ProjectStage;
  title: string;
  projects: Project[];
  totalValue: number;
}

// =============================================
// NOTIFICATIONS
// =============================================

export type NotificationType = 
  // Generic types
  | 'deadline'
  | 'approval'
  | 'update'
  | 'reminder'
  | 'escalation'
  | 'digest'
  // CRM-specific types
  | 'quote_accepted'       // Quote was accepted by client
  | 'quote_rejected'       // Quote was rejected
  | 'quote_expiring'       // Quote expires soon
  | 'lead_assigned'        // New lead assigned to user
  | 'project_stage_changed' // Project moved to new stage
  | 'deal_won'            // Project successfully closed
  | 'deal_lost'           // Project lost
  | 'follow_up_reminder'   // Follow up with contact/company
  | 'contact_created'      // New contact added
  | 'company_created';     // New company added

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entity_type?: 'company' | 'contact' | 'lead' | 'quote' | 'project' | 'task';
  entity_id?: string;
  deep_link?: string;
  read_at?: string;
  is_digest?: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  types_enabled: NotificationType[];
  digest_enabled: boolean;
  digest_frequency?: 'hourly' | 'daily' | 'weekly';
  digest_time?: string;
  do_not_disturb_start?: string;
  do_not_disturb_end?: string;
  ai_automation_enabled: boolean;
  ai_digest_only: boolean;
  ai_failure_notify: boolean;
}

// =============================================
// MUTATION TYPES (for React Query)
// =============================================

export interface MutationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
}

export interface UpdateMutationPayload<T> {
  id: string;
  data: Partial<T>;
}

export interface DeleteMutationPayload {
  id: string;
}

// Specific mutation payloads matching audit requirements
// These extend UpdateMutationPayload to provide semantic type names for mutations
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CompanyUpdatePayload extends UpdateMutationPayload<CompanyFormData> {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ContactUpdatePayload extends UpdateMutationPayload<ContactFormData> {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProjectUpdatePayload extends UpdateMutationPayload<ProjectFormData> {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface QuoteUpdatePayload extends UpdateMutationPayload<QuoteFormData> {}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}

// =============================================
// UTILITY TYPES
// =============================================

// Custom fields can be strings, numbers, booleans, or null
export type CustomFieldValue = string | number | boolean | null;
export type CustomFields = Record<string, CustomFieldValue>;

export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

export type WithOwner<T> = T & {
  owner_id: string;
  owner?: Profile;
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Type guard helpers
export function isCompany(entity: unknown): entity is Company {
  return typeof entity === 'object' && entity !== null && 'name' in entity && 'status' in entity;
}

export function isContact(entity: unknown): entity is Contact {
  return typeof entity === 'object' && entity !== null && 'first_name' in entity && 'last_name' in entity;
}

export function isProject(entity: unknown): entity is Project {
  return typeof entity === 'object' && entity !== null && 'title' in entity && 'stage' in entity;
}
