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

    // List users and find by email (avoid direct HTTP calls)
    const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) {
      console.error('listUsers error:', listErr);
      return new Response(JSON.stringify({ error: 'Error consultando usuarios' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const user = usersData?.users?.find((u) => (u.email || '').toLowerCase() === email);
    if (!user) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

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
