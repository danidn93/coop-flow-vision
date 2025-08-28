import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const testUsers = [
      {
        email: 'admin@cooperativa.com',
        password: 'admin123',
        first_name: 'Carlos',
        middle_name: 'Eduardo',
        surname_1: 'Pérez',
        surname_2: 'González',
        id_number: '1700000001',
        phone: '0987654321',
        address: 'Av. Principal 123, Quito',
        role: 'administrator'
      },
      {
        email: 'presidente@cooperativa.com',
        password: 'presidente123',
        first_name: 'María',
        middle_name: 'Elena',
        surname_1: 'Rodríguez',
        surname_2: 'Vásquez',
        id_number: '1700000002',
        phone: '0987654322',
        address: 'Calle Real 456, Quito',
        role: 'president'
      },
      {
        email: 'manager@cooperativa.com',
        password: 'manager123',
        first_name: 'Luis',
        middle_name: 'Antonio',
        surname_1: 'Morales',
        surname_2: 'Torres',
        id_number: '1700000003',
        phone: '0987654323',
        address: 'Sector Norte 789, Quito',
        role: 'manager'
      },
      {
        email: 'empleado@cooperativa.com',
        password: 'empleado123',
        first_name: 'Ana',
        middle_name: 'Cristina',
        surname_1: 'Herrera',
        surname_2: 'Jiménez',
        id_number: '1700000004',
        phone: '0987654324',
        address: 'Zona Sur 321, Quito',
        role: 'employee'
      },
      {
        email: 'socio@cooperativa.com',
        password: 'socio123',
        first_name: 'Roberto',
        middle_name: 'Francisco',
        surname_1: 'Castillo',
        surname_2: 'Mendoza',
        id_number: '1700000005',
        phone: '0987654325',
        address: 'Barrio Central 654, Quito',
        role: 'partner'
      },
      {
        email: 'conductor@cooperativa.com',
        password: 'conductor123',
        first_name: 'Miguel',
        middle_name: 'Ángel',
        surname_1: 'Vargas',
        surname_2: 'Ruiz',
        id_number: '1700000006',
        phone: '0987654326',
        address: 'Sector Este 987, Quito',
        role: 'driver'
      },
      {
        email: 'oficial@cooperativa.com',
        password: 'oficial123',
        first_name: 'Patricia',
        middle_name: 'Isabel',
        surname_1: 'Salinas',
        surname_2: 'Paredes',
        id_number: '1700000007',
        phone: '0987654327',
        address: 'Zona Oeste 147, Quito',
        role: 'official'
      },
      {
        email: 'cliente@cooperativa.com',
        password: 'cliente123',
        first_name: 'Diego',
        middle_name: 'Andrés',
        surname_1: 'Ramírez',
        surname_2: 'Silva',
        id_number: '1700000008',
        phone: '0987654328',
        address: 'Sector Urbano 258, Quito',
        role: 'client'
      }
    ];

    const results = [];
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(userData.email);
        
        if (existingUser.user) {
          results.push({
            email: userData.email,
            status: 'already_exists',
            message: 'Usuario ya existe'
          });
          continue;
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            first_name: userData.first_name,
            middle_name: userData.middle_name,
            surname_1: userData.surname_1,
            surname_2: userData.surname_2,
            id_number: userData.id_number,
            phone: userData.phone,
            address: userData.address
          }
        });

        if (authError) {
          results.push({
            email: userData.email,
            status: 'error',
            message: authError.message
          });
          continue;
        }

        if (!authUser.user) {
          results.push({
            email: userData.email,
            status: 'error',
            message: 'No se pudo crear el usuario'
          });
          continue;
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            first_name: userData.first_name,
            middle_name: userData.middle_name,
            surname_1: userData.surname_1,
            surname_2: userData.surname_2,
            id_number: userData.id_number,
            phone: userData.phone,
            address: userData.address
          });

        if (profileError) {
          results.push({
            email: userData.email,
            status: 'error',
            message: `Error en perfil: ${profileError.message}`
          });
          continue;
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authUser.user.id,
            role: userData.role
          });

        if (roleError) {
          results.push({
            email: userData.email,
            status: 'error',
            message: `Error en rol: ${roleError.message}`
          });
          continue;
        }

        results.push({
          email: userData.email,
          status: 'success',
          message: 'Usuario creado exitosamente',
          credentials: {
            email: userData.email,
            password: userData.password,
            role: userData.role
          }
        });

      } catch (error) {
        results.push({
          email: userData.email,
          status: 'error',
          message: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: testUsers.length,
          created: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
          existing: results.filter(r => r.status === 'already_exists').length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating test users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});