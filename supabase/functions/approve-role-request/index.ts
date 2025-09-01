import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalData {
  request_id: string;
  action: 'approve' | 'reject';
  notes?: string;
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
    // Create supabase client (for auth)
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

    // Check if user is administrator
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'administrator');

    if (rolesError || !userRoles || userRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para realizar esta acción' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Create an authenticated client for RLS-aware queries
    const supabaseAuthed = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Parse request body
    const requestData: ApprovalData = await req.json();

    if (!requestData.request_id || !requestData.action) {
      return new Response(
        JSON.stringify({ error: 'ID de solicitud y acción son requeridos' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get the role request
    const { data: roleRequest, error: fetchError } = await supabaseAuthed
      .from('role_requests')
      .select('requester_id, requested_role, status')
      .eq('id', requestData.request_id)
      .maybeSingle();

    if (fetchError || !roleRequest) {
      return new Response(
        JSON.stringify({ error: 'Solicitud no encontrada' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (roleRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Esta solicitud ya ha sido procesada' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Update the role request status
    const { error: updateError } = await supabaseAuthed
      .from('role_requests')
      .update({
        status: requestData.action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        notes: requestData.notes || null
      })
      .eq('id', requestData.request_id);

    if (updateError) {
      console.error('Error updating role request:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error actualizando solicitud' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // If approved, add the role to the user
    if (requestData.action === 'approve') {
      const { error: roleAssignError } = await supabaseAuthed
        .from('user_roles')
        .insert({
          user_id: roleRequest.requester_id,
          role: roleRequest.requested_role
        });

      if (roleAssignError) {
        console.error('Error assigning role:', roleAssignError);
        // Don't fail the entire request if role assignment fails
        // The request is still marked as approved
      }
    }

    // Create notification for the requester
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

    const roleName = roleNames[roleRequest.requested_role as keyof typeof roleNames] || roleRequest.requested_role;
    const statusText = requestData.action === 'approve' ? 'aprobada' : 'rechazada';
    const title = `Solicitud de Rol ${requestData.action === 'approve' ? 'Aprobada' : 'Rechazada'}`;
    const message = `Tu solicitud para el rol de ${roleName} ha sido ${statusText}.${requestData.notes ? ` Notas: ${requestData.notes}` : ''}`;

    const { error: notificationError } = await supabaseAuthed
      .from('notifications')
      .insert({
        user_id: roleRequest.requester_id,
        title: title,
        message: message,
        type: 'role_response',
        metadata: {
          request_id: requestData.request_id,
          action: requestData.action,
          role: roleRequest.requested_role
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        message: `Solicitud ${statusText} correctamente`
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