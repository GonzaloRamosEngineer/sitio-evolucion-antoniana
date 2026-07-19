import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
// Cambiamos el nombre de la variable para que sea coherente, 
// pero en Supabase podés seguir usando la misma KEY o crear una nueva RESEND_API_KEY
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('SENDGRID_API_KEY');
const SITE_URL = Deno.env.get('SITE_URL');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const FROM_EMAIL = 'Fundación Evolución Antoniana <info@evolucionantoniana.com>';
async function logEmailAttempt(supabaseAdmin, logEntry) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('email_log').insert([
      logEntry
    ]);
  } catch (e) {
    console.error('Error logging email:', e);
  }
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Invalid JSON'
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  const { registration_id, user_email, user_name, activity_title, confirmation_token } = payload;
  if (!registration_id || !user_email || !user_name || !activity_title || !confirmation_token) {
    return new Response(JSON.stringify({
      error: 'Missing fields'
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  if (!RESEND_API_KEY || !SITE_URL) {
    return new Response(JSON.stringify({
      error: 'Missing config'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const confirmationUrl = `${SITE_URL}/confirm-attendance?token=${confirmation_token}`;
  const subject = `Confirma tu inscripción: ${activity_title}`;
  // Estructura de HTML mantenida
  const emailHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #003B71;">¡Hola ${user_name}!</h2>
      <p>Gracias por pre-inscribirte en: <strong>${activity_title}</strong>.</p>
      <p>Confirmá tu asistencia haciendo clic en el botón:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmationUrl}" style="background-color: #003B71; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirmar Asistencia</a>
      </div>
      <p style="font-size: 0.8em; color: #777;">Si el botón no funciona: ${confirmationUrl}</p>
    </div>
  `;
  try {
    // 🚀 ENCHUFE RESEND
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [
          user_email
        ],
        subject: subject,
        html: emailHtml
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }
    await logEmailAttempt(supabaseAdmin, {
      registration_id,
      recipient_email: user_email,
      subject,
      activity_title,
      status: 'sent'
    });
    return new Response(JSON.stringify({
      message: 'Enviado con Resend'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    await logEmailAttempt(supabaseAdmin, {
      registration_id,
      recipient_email: user_email,
      subject,
      activity_title,
      status: 'error',
      error_message: error.message
    });
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
