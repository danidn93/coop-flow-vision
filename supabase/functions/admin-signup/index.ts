import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  middle_name?: string;
  surname_1: string;
  surname_2?: string;
  id_number: string;
  phone: string;
  address: string;
  role: string;
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
    // Create admin client with service role key
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

    // Validate request body
    const text = await req.text();
    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Body del request vacío' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    let signupData: SignupRequest;
    try {
      signupData = JSON.parse(text);
      console.log('Received signup data:', signupData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Validate required fields
    const requiredFields = ['email', 'password', 'first_name', 'surname_1', 'id_number', 'phone', 'address', 'role'];
    const missingFields = requiredFields.filter(field => !signupData[field as keyof SignupRequest]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Campos faltantes: ${missingFields.join(', ')}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if id_number already exists
    console.log('Checking for existing profile with id_number:', signupData.id_number);
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id_number')
      .eq('id_number', signupData.id_number)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Profile check error:', profileCheckError);
      return new Response(
        JSON.stringify({ error: 'Error verificando cédula existente' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (existingProfile) {
      console.log('Profile already exists with this id_number');
      return new Response(
        JSON.stringify({ 
          error: 'Ya existe un usuario con esta cédula' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if email already exists using REST API
    console.log('Checking for existing user with email:', signupData.email);
    const emailCheckResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?email=${encodeURIComponent(signupData.email)}`,
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
      console.error('Email check failed:', await emailCheckResponse.text());
      return new Response(
        JSON.stringify({ error: 'Error verificando email existente' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const existingUsers = await emailCheckResponse.json();
    if (existingUsers.users && existingUsers.users.length > 0) {
      const existingUser = existingUsers.users[0];
      console.log('Email exists. Ensuring profile and role for user:', existingUser.id);

      // Ensure profile exists for this auth user
      const { data: profileByUser, error: profileByUserError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (profileByUserError) {
        console.error('Error checking profile by user_id:', profileByUserError);
        return new Response(
          JSON.stringify({ error: 'Error verificando el perfil existente' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      if (!profileByUser) {
        console.log('No profile found for existing user. Creating profile...');
        const { error: insertProfileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: existingUser.id,
            first_name: signupData.first_name,
            middle_name: signupData.middle_name,
            surname_1: signupData.surname_1,
            surname_2: signupData.surname_2,
            id_number: signupData.id_number,
            phone: signupData.phone,
            address: signupData.address
          });

        if (insertProfileError) {
          console.error('Error creating profile for existing user:', insertProfileError);
          return new Response(
            JSON.stringify({ error: 'Error creando el perfil del usuario existente' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
          );
        }
      }

      // Ensure role exists/updated
      const { data: existingRole, error: roleFetchError } = await supabaseAdmin
        .from('user_roles')
        .select('id, role')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (roleFetchError) {
        console.error('Error checking existing role:', roleFetchError);
      }

      if (existingRole) {
        if (existingRole.role !== signupData.role) {
          console.log('Updating role for existing user');
          const { error: roleUpdateError } = await supabaseAdmin
            .from('user_roles')
            .update({ role: signupData.role })
            .eq('id', existingRole.id);
          if (roleUpdateError) {
            console.error('Role update error:', roleUpdateError);
          }
        }
      } else {
        console.log('Inserting role for existing user');
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: existingUser.id, role: signupData.role });
        if (roleInsertError) {
          console.error('Role insert error:', roleInsertError);
        }
      }

      return new Response(
        JSON.stringify({
          message: 'Usuario existente actualizado',
          user: { id: existingUser.id, email: existingUser.email }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Create user using REST API
    console.log('Creating user with admin API');
    const createUserResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
          email_confirm: true,
          user_metadata: {
            first_name: signupData.first_name,
            middle_name: signupData.middle_name,
            surname_1: signupData.surname_1,
            surname_2: signupData.surname_2,
            id_number: signupData.id_number,
            phone: signupData.phone,
            address: signupData.address
          }
        })
      }
    );

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('User creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error creando el usuario' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const authData = await createUserResponse.json();

    if (authData.user) {
      // Create profile manually since the trigger won't work with admin.createUser
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: signupData.first_name,
          middle_name: signupData.middle_name,
          surname_1: signupData.surname_1,
          surname_2: signupData.surname_2,
          id_number: signupData.id_number,
          phone: signupData.phone,
          address: signupData.address
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        // Delete the user if profile creation fails using REST API
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${authData.user.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            }
          }
        );
        return new Response(
          JSON.stringify({ error: 'Error creando el perfil del usuario' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      // Assign role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: signupData.role
        });

      if (roleError) {
        console.error('Role error:', roleError);
        // Don't delete user for role errors, just log it
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Usuario creado exitosamente',
        user: authData.user 
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