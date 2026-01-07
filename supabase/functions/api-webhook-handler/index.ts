/**
 * =============================================
 * AI WEBHOOK HANDLER - EDGE FUNCTION
 * =============================================
 * Datum: 7 januari 2026
 * Doel: Externe AI-integraties van n8n en Manus AI
 * 
 * Endpoints:
 * - POST /api-webhook-handler/lead      - Create lead
 * - POST /api-webhook-handler/company   - Create company
 * - POST /api-webhook-handler/contact   - Create contact
 * - POST /api-webhook-handler/note      - Add note to entity
 * 
 * Security:
 * - API_KEY validation via X-API-Key header
 * - CORS enabled for webhook sources
 * - Rate limiting via Supabase Edge
 * 
 * Features:
 * - Type-safe payload validation
 * - Automatic notifications for sales reps
 * - Audit logging (detecteert AI via user agent)
 * - Error handling met duidelijke messages
 * =============================================
 */

/// <reference path="./types.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type Database = any; // Define your database types here

// =============================================
// TYPES
// =============================================

interface WebhookPayload {
  action: 'create_lead' | 'create_company' | 'create_contact' | 'add_note';
  data: any;
  source?: 'n8n' | 'manus' | 'zapier' | 'other';
  metadata?: {
    workflow_id?: string;
    workflow_name?: string;
    trigger_timestamp?: string;
  };
}

interface LeadPayload {
  company_name: string;
  title: string;
  description?: string;
  project_type?: 'landing_page' | 'corporate_website' | 'ecommerce' | 'web_app' | 'blog' | 'portfolio' | 'custom';
  value?: number;
  expected_close_date?: string;
  contact_email?: string;
  contact_name?: string;
  contact_phone?: string;
  owner_id?: string; // Sales rep to assign to
  source?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

interface CompanyPayload {
  name: string;
  website?: string;
  email?: string;
  phone?: string;
  industry_id?: string;
  company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '501+';
  status?: 'prospect' | 'active' | 'inactive' | 'churned';
  priority?: 'low' | 'medium' | 'high';
  owner_id?: string;
  tags?: string[];
  notes?: string;
}

interface ContactPayload {
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  is_primary?: boolean;
  is_decision_maker?: boolean;
  owner_id?: string;
}

interface NotePayload {
  entity_type: 'company' | 'contact' | 'project' | 'quote';
  entity_id: string;
  content: string;
  interaction_type?: 'call' | 'email' | 'meeting' | 'note';
}

// =============================================
// CONFIGURATION
// =============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function validateApiKey(apiKey: string | null): boolean {
  const validApiKey = Deno.env.get('WEBHOOK_API_KEY');
  
  if (!validApiKey) {
    console.error('WEBHOOK_API_KEY not configured in Edge Function secrets');
    return false;
  }
  
  return apiKey === validApiKey;
}

async function getDefaultSalesRep(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'SALES')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  
  return (data as { id: string } | null)?.id || null;
}

async function sendNotification(
  supabase: SupabaseClient<Database>,
  recipientId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  deepLink?: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: recipientId,
      type,
      priority: 'normal',
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      deep_link: deepLink,
      read_at: null,
      is_digest: false,
    }]);

  if (error) {
    console.error('Failed to send notification:', error);
  }
}

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // =============================================
    // STEP 1: Authentication
    // =============================================
    const apiKey = req.headers.get('x-api-key');
    
    if (!validateApiKey(apiKey)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Invalid or missing API key',
          message: 'Please provide a valid X-API-Key header'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // =============================================
    // STEP 2: Initialize Supabase Client
    // =============================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // =============================================
    // STEP 3: Parse Request
    // =============================================
    const payload: WebhookPayload = await req.json();
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const clientApp = req.headers.get('x-client-app') || payload.source || 'Unknown';

    console.log(`Webhook received: ${payload.action} from ${clientApp}`);
    console.log(`User-Agent: ${userAgent}`);

    // =============================================
    // STEP 4: Route to Action Handler
    // =============================================
    
    let result;
    
    switch (payload.action) {
      case 'create_lead':
        result = await handleCreateLead(supabase, payload.data, clientApp, userAgent);
        break;
        
      case 'create_company':
        result = await handleCreateCompany(supabase, payload.data, clientApp);
        break;
        
      case 'create_contact':
        result = await handleCreateContact(supabase, payload.data, clientApp);
        break;
        
      case 'add_note':
        result = await handleAddNote(supabase, payload.data, clientApp);
        break;
        
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Unknown action: ${payload.action}`,
            supported_actions: ['create_lead', 'create_company', 'create_contact', 'add_note']
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    // =============================================
    // STEP 5: Return Success Response
    // =============================================
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        metadata: {
          action: payload.action,
          source: clientApp,
          timestamp: new Date().toISOString(),
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// =============================================
// ACTION HANDLERS
// =============================================

async function handleCreateLead(
  supabase: SupabaseClient<Database>, 
  data: LeadPayload,
  source: string,
  userAgent: string
): Promise<{
  project_id: string;
  company_id: string;
  contact_id?: string;
  owner_id: string | null;
  message: string;
}> {
  // Validate required fields
  if (!data.company_name || !data.title) {
    throw new Error('Missing required fields: company_name and title are required');
  }

  // Step 1: Find or create company
  let companyId: string;
  
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .ilike('name', data.company_name)
    .single();

  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    // Create new company
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: data.company_name,
        email: data.contact_email,
        status: 'prospect',
        priority: data.priority || 'medium',
        owner_id: data.owner_id || await getDefaultSalesRep(supabase),
        tags: data.tags || [],
        notes: `Created via ${source} webhook`,
      }])
      .select()
      .single();

    if (companyError) throw companyError;
    companyId = newCompany.id;
  }

  // Step 2: Create contact if email/name provided
  let contactId: string | undefined;
  
  if (data.contact_email || data.contact_name) {
    const nameParts = data.contact_name?.split(' ') || ['', ''];
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert([{
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        email: data.contact_email,
        phone: data.contact_phone,
        is_primary: true,
        owner_id: data.owner_id || await getDefaultSalesRep(supabase),
      }])
      .select()
      .single();

    if (!contactError) {
      contactId = newContact.id;
    }
  }

  // Step 3: Create project (lead)
  const ownerId = data.owner_id || await getDefaultSalesRep(supabase);
  
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert([{
      company_id: companyId,
      contact_id: contactId,
      title: data.title,
      description: data.description,
      project_type: data.project_type || 'corporate_website',
      value: data.value || 5000, // Default estimate
      currency: 'EUR',
      stage: 'lead',
      probability: 10, // Initial probability
      expected_close_date: data.expected_close_date,
      owner_id: ownerId,
      source: data.source || source,
      tags: data.tags || [],
      hosting_included: false,
      maintenance_contract: false,
    }])
    .select()
    .single();

  if (projectError) throw projectError;

  // Step 4: Send notification to assigned sales rep
  if (ownerId) {
    await sendNotification(
      supabase,
      ownerId,
      'lead_assigned',
      '🎯 Nieuwe lead toegewezen',
      `Nieuwe lead "${data.title}" voor ${data.company_name} (via ${source})`,
      'project',
      project.id,
      `/projects/${project.id}`
    );
  }

  // Step 5: Create activity log entry
  await supabase
    .from('interactions')
    .insert([{
      company_id: companyId,
      contact_id: contactId,
      project_id: project.id,
      type: 'note',
      subject: 'Lead aangemaakt via webhook',
      notes: `Lead automatisch aangemaakt door ${source}.\nUser Agent: ${userAgent}`,
      direction: 'inbound',
      user_id: ownerId,
    }]);

  return {
    project_id: project.id,
    company_id: companyId,
    contact_id: contactId,
    owner_id: ownerId,
    message: 'Lead successfully created and assigned'
  };
}

async function handleCreateCompany(
  supabase: SupabaseClient<Database>,
  data: CompanyPayload,
  source: string
): Promise<{
  company_id: string;
  owner_id: string | null;
  message: string;
}> {
  // Validate required fields
  if (!data.name) {
    throw new Error('Missing required field: name');
  }

  // Check if company already exists
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .ilike('name', data.name)
    .single();

  if (existing) {
    throw new Error(`Company "${data.name}" already exists with ID: ${existing.id}`);
  }

  // Create company
  const ownerId = data.owner_id || await getDefaultSalesRep(supabase);
  
  const { data: company, error } = await supabase
    .from('companies')
    .insert([{
      name: data.name,
      website: data.website,
      email: data.email,
      phone: data.phone,
      industry_id: data.industry_id,
      company_size: data.company_size,
      status: data.status || 'prospect',
      priority: data.priority || 'medium',
      owner_id: ownerId,
      tags: data.tags || [],
      notes: data.notes || `Created via ${source} webhook`,
    }])
    .select()
    .single();

  if (error) throw error;

  // Send notification
  if (ownerId) {
    await sendNotification(
      supabase,
      ownerId,
      'company_created',
      '🏢 Nieuw bedrijf toegevoegd',
      `Bedrijf "${data.name}" is toegevoegd via ${source}`,
      'company',
      company.id,
      `/companies/${company.id}`
    );
  }

  return {
    company_id: company.id,
    owner_id: ownerId,
    message: 'Company successfully created'
  };
}

async function handleCreateContact(
  supabase: SupabaseClient<Database>,
  data: ContactPayload,
  source: string
): Promise<{
  contact_id: string;
  company_id: string;
  owner_id: string | null;
  message: string;
}> {
  // Validate required fields
  if (!data.company_id || !data.first_name || !data.last_name) {
    throw new Error('Missing required fields: company_id, first_name, and last_name');
  }

  // Verify company exists
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', data.company_id)
    .single();

  if (!company) {
    throw new Error(`Company with ID ${data.company_id} not found`);
  }

  // Create contact
  const ownerId = data.owner_id || await getDefaultSalesRep(supabase);
  
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert([{
      company_id: data.company_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      position: data.position,
      is_primary: data.is_primary ?? false,
      is_decision_maker: data.is_decision_maker ?? false,
      owner_id: ownerId,
      notes: `Created via ${source} webhook`,
    }])
    .select()
    .single();

  if (error) throw error;

  // Send notification
  if (ownerId) {
    await sendNotification(
      supabase,
      ownerId,
      'contact_created',
      '👤 Nieuw contact toegevoegd',
      `Contact "${data.first_name} ${data.last_name}" toegevoegd aan ${company.name} (via ${source})`,
      'contact',
      contact.id,
      `/contacts/${contact.id}`
    );
  }

  return {
    contact_id: contact.id,
    company_id: data.company_id,
    owner_id: ownerId,
    message: 'Contact successfully created'
  };
}

async function handleAddNote(
  supabase: SupabaseClient<Database>,
  data: NotePayload,
  source: string
): Promise<{
  interaction_id: string;
  entity_type: string;
  entity_id: string;
  message: string;
}> {
  // Validate required fields
  if (!data.entity_type || !data.entity_id || !data.content) {
    throw new Error('Missing required fields: entity_type, entity_id, and content');
  }

  // Map entity type to interaction fields
  const interactionData: Record<string, string> = {
    type: data.interaction_type || 'note',
    subject: `Note via ${source}`,
    notes: data.content,
    direction: 'inbound',
  };

  // Set appropriate entity ID field
  switch (data.entity_type) {
    case 'company':
      interactionData.company_id = data.entity_id;
      break;
    case 'contact':
      interactionData.contact_id = data.entity_id;
      break;
    case 'project':
      interactionData.project_id = data.entity_id;
      break;
    case 'quote':
      interactionData.project_id = data.entity_id; // Quotes linked via project
      break;
    default:
      throw new Error(`Invalid entity_type: ${data.entity_type}`);
  }

  // Create interaction
  const { data: interaction, error } = await supabase
    .from('interactions')
    .insert([interactionData])
    .select()
    .single();

  if (error) throw error;

  return {
    interaction_id: interaction.id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    message: 'Note successfully added'
  };
}
