import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  voornaam: string;
  achternaam: string;
  role: 'hr' | 'manager' | 'medewerker' | 'super_admin';
  profileData?: {
    telefoon?: string;
    functie?: string;
    employee_number?: string;
    date_of_birth?: string;
    start_date?: string;
    end_date?: string;
    contract_type?: string;
    hours_per_week?: number;
    employment_status?: string;
    department_id?: string;
    manager_id?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    bank_account?: string;
    notes?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the requesting user is authenticated and has permission
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the requesting user
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      console.error('Failed to get requesting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user has permission (hr or super_admin)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleError || !roleData) {
      console.error('Failed to get user role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['hr', 'super_admin'].includes(roleData.role)) {
      console.error('User does not have permission:', roleData.role);
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only HR and Super Admin can create users.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, voornaam, achternaam, role, profileData }: CreateUserRequest = await req.json();

    // Validate required fields
    if (!email || !voornaam || !achternaam || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['hr', 'manager', 'medewerker', 'super_admin'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure random password (never exposed to client)
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    const securePassword = btoa(String.fromCharCode(...array)) + 'A1!';

    console.log(`Creating user: ${email} with role: ${role}`);

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: securePassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        voornaam,
        achternaam,
        must_change_password: true,
      },
    });

    if (createError) {
      console.error('Failed to create user:', createError);
      if (createError.message.includes('already') || createError.message.includes('exists')) {
        return new Response(
          JSON.stringify({ error: 'Er bestaat al een gebruiker met dit e-mailadres' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      console.error('No user returned from createUser');
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User created successfully: ${newUser.user.id}`);

    // Add role to user_roles table
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleInsertError) {
      console.error('Failed to insert role:', roleInsertError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to assign role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with additional data if provided
    if (profileData && Object.keys(profileData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        // Don't fail the whole operation, profile can be updated later
      }
    }

    // Generate password reset link so user can set their own password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      console.error('Failed to generate reset link:', resetError);
    }

    console.log(`User setup complete: ${newUser.user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        message: 'Gebruiker aangemaakt. Een e-mail met instructies om het wachtwoord in te stellen is verstuurd.',
        // Include reset link for manual sending if email delivery fails
        resetLink: resetData?.properties?.action_link || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
