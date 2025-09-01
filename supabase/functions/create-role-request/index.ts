import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoleRequestData {
  user_id: string;
  requested_roles: string[];
  justification: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  try {
    // Create supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorización requerido' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Parse request body
    const requestData: RoleRequestData = await req.json();

    // Validate request data
    if (!requestData.requested_roles || !requestData.justification) {
      return new Response(
        JSON.stringify({ error: 'Roles solicitados y justificación son requeridos' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get user profile for notification
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, surname_1')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo perfil de usuario' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get all administrators to notify
    const { data: adminRoles, error: adminRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'administrator');

    if (adminRolesError) {
      console.error('Error fetching admin roles:', adminRolesError);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo administradores' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Create role request records for each requested role
    const roleRequestPromises = requestData.requested_roles.map(async (role) => {
      const { error: roleRequestError } = await supabase
        .from('role_requests')
        .insert({
          requester_id: user.id,
          requested_role: role,
          justification: requestData.justification,
          status: 'pending'
        });

      if (roleRequestError) {
        console.error('Error creating role request:', roleRequestError);
        throw roleRequestError;
      }
    });

    await Promise.all(roleRequestPromises);

    // Create notifications for all administrators
    const roleNames = {
      administrator: 'Administrador',
      president: 'Presidente',
      manager: 'Manager',
      employee: 'Empleado',
      partner: 'Socio',
      driver: 'Conductor',
      official: 'Oficial',
      client: 'Cliente'
    };

    const rolesText = requestData.requested_roles
      .map(role => roleNames[role as keyof typeof roleNames] || role)
      .join(', ');

    const userName = `${userProfile.first_name} ${userProfile.surname_1}`;
    
    for (const adminRole of adminRoles) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: adminRole.user_id,
          title: 'Solicitud de Roles Adicionales',
          message: `${userName} ha solicitado los roles: ${rolesText}. Justificación: ${requestData.justification}`,
          type: 'role_request',
          metadata: {
            requester_id: user.id,
            requested_roles: requestData.requested_roles,
            justification: requestData.justification
          }
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Solicitud de roles enviada correctamente'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);