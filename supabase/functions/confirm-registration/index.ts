import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  let token;
  try {
    const body = await req.json();
    token = body.token;
    console.log('confirm-registration: Received token in body:', token);
  } catch (e) {
    console.error('confirm-registration: Failed to parse request body or get token:', e.message);
    return new Response(JSON.stringify({
      error: 'Token no proporcionado o payload inválido.'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.error('confirm-registration: Token is missing, not a string, or empty.');
    return new Response(JSON.stringify({
      error: 'Token de confirmación es requerido y debe ser válido.'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('confirm-registration: Missing Supabase environment variables.');
    return new Response(JSON.stringify({
      error: 'Error de configuración del servidor.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    console.log(`confirm-registration: Attempting to find registration with token: ${token}`);
    const { data: existingRegistration, error: selectError } = await supabaseAdmin.from('registrations').select('id, is_confirmed, activity_id').eq('confirmation_token', token).single(); // Expecting one or zero
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('confirm-registration: Error selecting registration by token:', selectError);
      return new Response(JSON.stringify({
        error: 'Error al buscar el registro de confirmación.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!existingRegistration) {
      console.warn('confirm-registration: Token not found:', token);
      return new Response(JSON.stringify({
        error: 'Este enlace de confirmación es inválido o ha expirado (token no encontrado).'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (existingRegistration.is_confirmed) {
      console.log('confirm-registration: Registration already confirmed for token:', token, 'Reg ID:', existingRegistration.id);
      return new Response(JSON.stringify({
        message: 'Tu asistencia ya ha sido confirmada previamente.'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`confirm-registration: Attempting to update registration ID: ${existingRegistration.id} for token: ${token}`);
    const { error: updateError, count } = await supabaseAdmin.from('registrations').update({
      is_confirmed: true,
      confirmation_token: null
    }).eq('id', existingRegistration.id) // Use ID for safer update after finding by token
    .eq('is_confirmed', false).select(); // count is not directly returned by .select() in js v2, check error or data
    if (updateError) {
      console.error('confirm-registration: Error updating registration:', updateError);
      return new Response(JSON.stringify({
        error: 'Error al actualizar tu confirmación en la base de datos.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // After an update, Supabase v2 .select() returns the updated rows.
    // If no rows were updated (e.g., is_confirmed was already true due to a race condition),
    // the returned data array would be empty if the condition wasn't met.
    // However, we already checked is_confirmed above. If we reach here, update should succeed.
    // A more direct check for `count` is not available like in raw SQL.
    // We rely on the fact that if `updateError` is null, the operation matching the criteria was successful.
    console.log('confirm-registration: Registration confirmed successfully for Reg ID:', existingRegistration.id);
    return new Response(JSON.stringify({
      message: '¡Asistencia confirmada exitosamente! Tu lugar está asegurado.'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error('confirm-registration: General exception:', e);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor al procesar la confirmación.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
