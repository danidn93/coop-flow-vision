import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckUserRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({ error: 'Body del request vacío' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let payload: CheckUserRequest;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const email = (payload.email || '').trim().toLowerCase();
    console.log('Checking email:', email);
    
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Use REST API to check if user exists with specific email
    console.log('Making request to admin users API...');
    const emailCheckResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        }
      }
    );

    if (!emailCheckResponse.ok) {
      console.error('Email check API failed:', await emailCheckResponse.text());
      return new Response(JSON.stringify({ error: 'Error consultando usuarios' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const existingUsers = await emailCheckResponse.json();
    console.log('API response:', JSON.stringify(existingUsers, null, 2));

    if (!existingUsers.users || existingUsers.users.length === 0) {
      console.log('No user found with email:', email);
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const user = existingUsers.users[0];
    console.log('Found user:', user.id, 'with email:', user.email);

    // Fetch profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, first_name, middle_name, surname_1, surname_2, id_number, phone, address')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('profile fetch error:', profileErr);
    }

    // Fetch roles
    const { data: rolesRows, error: rolesErr } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesErr) {
      console.error('roles fetch error:', rolesErr);
    }

    const roles = (rolesRows || []).map((r: any) => r.role);
    console.log('User roles:', roles);

    return new Response(
      JSON.stringify({
        exists: true,
        user: { id: user.id, email: user.email },
        profile: profile || null,
        roles,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('check-user error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
