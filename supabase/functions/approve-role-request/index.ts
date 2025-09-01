import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalData {
  request_id: string;
  approved_roles: string[];
  rejected_roles: string[];
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

    // Create an authenticated client for RLS-aware queries (using end-user JWT)
    const supabaseAuthed = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check if user is administrator (RLS-aware)
    const { data: userRoles, error: rolesError } = await supabaseAuthed
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'administrator');

    if (rolesError || !userRoles || userRoles.length === 0) {
      console.warn('approve-role-request: user lacks admin role or roles fetch failed', { rolesError, userId: user.id });
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para realizar esta acción' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // supabaseAuthed already created above

    // Parse request body
    const requestData: ApprovalData = await req.json();

    if (!requestData.request_id || (!requestData.approved_roles && !requestData.rejected_roles)) {
      return new Response(
        JSON.stringify({ error: 'ID de solicitud y roles a aprobar/rechazar son requeridos' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Get the role request
    const { data: roleRequest, error: fetchError } = await supabaseAuthed
      .from('role_requests')
      .select('requester_id, requested_roles, status, approved_roles, rejected_roles')
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

    // Update the role request with approved/rejected roles
    const newApprovedRoles = [...(roleRequest.approved_roles || []), ...(requestData.approved_roles || [])];
    const newRejectedRoles = [...(roleRequest.rejected_roles || []), ...(requestData.rejected_roles || [])];
    
    // Determine if all roles have been processed
    const allRolesProcessed = roleRequest.requested_roles.every((role: string) => 
      newApprovedRoles.includes(role) || newRejectedRoles.includes(role)
    );

    const { error: updateError } = await supabaseAuthed
      .from('role_requests')
      .update({
        approved_roles: newApprovedRoles,
        rejected_roles: newRejectedRoles,
        status: allRolesProcessed ? 'processed' : 'partial',
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

    // Add approved roles to user_roles
    if (requestData.approved_roles && requestData.approved_roles.length > 0) {
      for (const role of requestData.approved_roles) {
        const { error: roleAssignError } = await supabaseAuthed
          .from('user_roles')
          .insert({
            user_id: roleRequest.requester_id,
            role: role
          });

        if (roleAssignError) {
          console.error('Error assigning role:', roleAssignError);
          // Don't fail the entire request if role assignment fails
        }
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

    const approvedText = requestData.approved_roles?.length > 0 ? 
      `Aprobados: ${requestData.approved_roles.map(r => roleNames[r as keyof typeof roleNames] || r).join(', ')}.` : '';
    const rejectedText = requestData.rejected_roles?.length > 0 ? 
      `Rechazados: ${requestData.rejected_roles.map(r => roleNames[r as keyof typeof roleNames] || r).join(', ')}.` : '';
    
    const title = 'Respuesta a Solicitud de Roles';
    const message = `${approvedText} ${rejectedText}${requestData.notes ? ` Notas: ${requestData.notes}` : ''}`;

    const { error: notificationError } = await supabaseAuthed
      .from('notifications')
      .insert({
        user_id: roleRequest.requester_id,
        title: title,
        message: message,
        type: 'role_response',
        metadata: {
          request_id: requestData.request_id,
          approved_roles: requestData.approved_roles || [],
          rejected_roles: requestData.rejected_roles || []
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Roles procesados correctamente'
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