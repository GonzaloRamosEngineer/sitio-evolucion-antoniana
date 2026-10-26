// =============================================================================
// Edge Function: resend-verification
// =============================================================================
// Reenvía una invitación para que el usuario cree su propia contraseña.
// Usa el SMTP configurado en Supabase, que es el mismo canal del formulario
// “Olvidé mi contraseña”. No genera claves para compartir por fuera.
//
// Setup de Resend (una sola vez):
//  1. Crear cuenta en resend.com (gratis hasta 3000 mails/mes).
//  2. Agregar y verificar el dominio de la entidad (o usar el email de tu
//     cuenta Resend para pruebas iniciales).
//  3. Crear una API key en resend.com/api-keys.
//  4. Setear los secrets en Supabase:
//       supabase secrets set RESEND_API_KEY=re_xxxx
//       supabase secrets set RESEND_FROM_EMAIL="Nombre <noreply@dominio.org>"
//
// Deploy:  supabase functions deploy resend-verification
// Invocar: supabase.functions.invoke('resend-verification', { body: { userId } })
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { sitioEntidad } from "../_shared/entidad.generated.ts";
import { RUTAS_EXTERNAS, urlDelSitio } from "../_shared/rutas.ts";

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
    const SITE_URL = sitioEntidad(Deno.env.get("SITE_URL"));

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
      .select("email")
      .eq("id", userId)
      .single();

    if (targetErr || !targetUser) {
      return jsonResponse({ error: "Usuario no encontrado" }, 404);
    }

    const { error: inviteErr } = await supabaseAdmin.auth.resetPasswordForEmail(
      targetUser.email,
      { redirectTo: urlDelSitio(SITE_URL, RUTAS_EXTERNAS.ACTUALIZAR_CLAVE) },
    );

    if (inviteErr) {
      return jsonResponse(
        { error: inviteErr.message ?? "No se pudo enviar la invitación" },
        500,
      );
    }

    return jsonResponse({ sent: true, email: targetUser.email }, 200);
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
