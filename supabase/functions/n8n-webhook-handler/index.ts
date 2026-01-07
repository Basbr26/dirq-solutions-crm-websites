// Supabase Edge Function: n8n-webhook-handler
// Handles incoming webhooks from n8n automation (e.g., KVK registrations)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface N8nLeadPayload {
  type: "kvk_registration" | "linkedin_profile" | "website_scan";
  company_name: string;
  kvk_number?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  contact?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    linkedin_url?: string;
  };
  industry?: string;
  source: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication (API key or webhook secret)
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = req.headers.get("X-Webhook-Secret");
    
    const expectedSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
    
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid webhook secret" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse incoming payload
    const payload: N8nLeadPayload = await req.json();

    // Validate required fields
    if (!payload.company_name || !payload.type || !payload.source) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_name, type, source" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get default user for system-generated leads (e.g., admin or automation user)
    const defaultOwnerId = Deno.env.get("DEFAULT_LEAD_OWNER_ID");

    // Check if company already exists (by KVK number or name)
    let existingCompany = null;
    if (payload.kvk_number) {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("custom_fields->kvk_number", payload.kvk_number)
        .single();
      existingCompany = data;
    }

    if (!existingCompany) {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", payload.company_name)
        .single();
      existingCompany = data;
    }

    let companyId: string;

    if (existingCompany) {
      // Company exists, update if needed
      companyId = existingCompany.id;
      
      const updateData: any = {
        website: payload.website || undefined,
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        address: payload.address || undefined,
      };

      if (payload.industry) {
        // Try to find industry by name
        const { data: industryData } = await supabase
          .from("industries")
          .select("id")
          .ilike("name", payload.industry)
          .single();
        
        if (industryData) {
          updateData.industry_id = industryData.id;
        }
      }

      await supabase
        .from("companies")
        .update(updateData)
        .eq("id", companyId);

      console.log(`✅ Updated existing company: ${existingCompany.name}`);
    } else {
      // Create new company
      const companyData: any = {
        name: payload.company_name,
        website: payload.website,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        status: "prospect",
        priority: "medium",
        owner_id: defaultOwnerId,
        source: payload.source,
        custom_fields: {
          kvk_number: payload.kvk_number,
          ...payload.metadata,
        },
        tags: [payload.type, "n8n-automated"],
      };

      if (payload.industry) {
        const { data: industryData } = await supabase
          .from("industries")
          .select("id")
          .ilike("name", payload.industry)
          .single();
        
        if (industryData) {
          companyData.industry_id = industryData.id;
        }
      }

      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert(companyData)
        .select()
        .single();

      if (companyError) throw companyError;

      companyId = newCompany.id;
      console.log(`✅ Created new company: ${payload.company_name}`);
    }

    // Create contact if provided
    let contactId: string | null = null;
    if (payload.contact && payload.contact.first_name && payload.contact.last_name) {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          company_id: companyId,
          first_name: payload.contact.first_name,
          last_name: payload.contact.last_name,
          position: payload.contact.position,
          linkedin_url: payload.contact.linkedin_url,
          is_primary: true,
          is_decision_maker: false,
          owner_id: defaultOwnerId,
          tags: ["n8n-automated"],
        })
        .select()
        .single();

      if (!contactError && newContact) {
        contactId = newContact.id;
        console.log(`✅ Created contact: ${payload.contact.first_name} ${payload.contact.last_name}`);
      }
    }

    // Create an interaction/note about the automated lead
    await supabase
      .from("interactions")
      .insert({
        company_id: companyId,
        contact_id: contactId,
        user_id: defaultOwnerId,
        type: "note",
        subject: `Automatisch Lead: ${payload.type}`,
        description: `Lead automatisch aangemaakt via n8n.\n\nBron: ${payload.source}\nType: ${payload.type}\n\nMetadata: ${JSON.stringify(payload.metadata, null, 2)}`,
        is_task: false,
        tags: ["automated", "n8n", payload.type],
      });

    console.log(`✅ Created interaction for automated lead`);

    return new Response(
      JSON.stringify({
        success: true,
        company_id: companyId,
        contact_id: contactId,
        message: `Lead successfully processed: ${payload.company_name}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
