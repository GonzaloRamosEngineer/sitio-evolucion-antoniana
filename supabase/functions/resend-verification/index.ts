// =============================================================================
// Edge Function: resend-verification
// =============================================================================
// Genera un magic link de acceso y lo envía por email al usuario via Resend.
// Si RESEND_API_KEY no está configurada devuelve el link para que el admin
// lo comparta manualmente (fallback seguro).
//
// Al hacer clic en el link, el usuario queda logueado Y su email queda confirmado,
// lo que dispara el trigger handle_email_confirmed → is_verified = true.
//
// Setup de Resend (una sola vez):
//  1. Crear cuenta en resend.com (gratis hasta 3000 mails/mes).
//  2. Agregar y verificar el dominio evolucionantoniana.com (o usar el email
//     de tu cuenta Resend para pruebas iniciales).
//  3. Crear una API key en resend.com/api-keys.
//  4. Setear los secrets en Supabase:
//       supabase secrets set RESEND_API_KEY=re_xxxx
//       supabase secrets set RESEND_FROM_EMAIL="Evolución Antoniana <noreply@evolucionantoniana.com>"
//
// Deploy:  supabase functions deploy resend-verification
// Invocar: supabase.functions.invoke('resend-verification', { body: { userId } })
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ??
      "Evolución Antoniana <noreply@evolucionantoniana.com>";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta token de autorización" }, 401);
    }

    const supabaseCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerErr } =
      await supabaseCaller.auth.getUser();
    if (callerErr || !caller) {
      return jsonResponse({ error: "Sesión inválida" }, 401);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profErr || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "No autorizado: se requiere rol admin" }, 403);
    }

    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    if (!userId) {
      return jsonResponse({ error: "Falta userId" }, 400);
    }

    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (targetErr || !targetUser) {
      return jsonResponse({ error: "Usuario no encontrado" }, 404);
    }

    // Genera el magic link (un solo uso, expira en 1h por defecto en Supabase).
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: targetUser.email,
      });

    if (linkErr || !linkData?.properties?.action_link) {
      return jsonResponse(
        { error: linkErr?.message ?? "No se pudo generar el link" },
        500,
      );
    }

    const actionLink = linkData.properties.action_link;

    // Si Resend está configurado, enviar el email directamente.
    if (RESEND_API_KEY) {
      const firstName = targetUser.name?.split(" ")[0] || "usuario";
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"></head>
        <body style="font-family:sans-serif;background:#f9fafb;padding:32px">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb">
            <img src="https://evolucionantoniana.com/logo-ea.png" alt="Evolución Antoniana" style="height:48px;margin-bottom:24px" />
            <h2 style="color:#1e2a4a;margin:0 0 8px">Acceso a tu cuenta</h2>
            <p style="color:#6b7280;margin:0 0 24px">Hola ${firstName}, el administrador generó un link de acceso para tu cuenta en el portal de Evolución Antoniana.</p>
            <a href="${actionLink}"
               style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px">
              Acceder a mi cuenta
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">
              Este link es de un solo uso y expira en 1 hora.<br/>
              Si no esperabas este email, podés ignorarlo.
            </p>
          </div>
        </body>
        </html>
      `;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [targetUser.email],
          subject: "Acceso a tu cuenta — Fundación Evolución Antoniana",
          html: emailHtml,
        }),
      });

      if (!resendRes.ok) {
        const resendError = await resendRes.json().catch(() => ({}));
        // Si el envío falla, devolvemos el link de todas formas para que
        // el admin pueda compartirlo manualmente.
        return jsonResponse(
          {
            link: actionLink,
            emailError: resendError?.message ?? "No se pudo enviar el email",
          },
          200,
        );
      }

      return jsonResponse({ sent: true, email: targetUser.email }, 200);
    }

    // Sin Resend: devuelve el link para compartir manualmente.
    return jsonResponse({ link: actionLink }, 200);
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
