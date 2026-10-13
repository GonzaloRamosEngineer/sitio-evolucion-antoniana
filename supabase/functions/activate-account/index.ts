// =============================================================================
// Edge Function: activate-account
// =============================================================================
// Se ejecuta al terminar de definir una contraseña desde un enlace de
// recuperación/invitación. Sólo marca como verificado al titular de la sesión
// si Supabase confirma que su email está confirmado.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Falta token de autorización" }, 401);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return jsonResponse({ error: "Sesión inválida" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(caller.id);
    const authUser = authData?.user;
    if (authErr || !authUser) return jsonResponse({ error: "No se pudo comprobar la cuenta" }, 500);
    if (!authUser.email_confirmed_at && !authUser.confirmed_at) {
      return jsonResponse({ error: "El email todavía no fue confirmado" }, 403);
    }

    const { data: profile, error: updateErr } = await admin
      .from("users")
      .update({ is_verified: true })
      .eq("id", caller.id)
      .select("id, is_verified")
      .maybeSingle();

    if (updateErr || !profile?.is_verified) {
      return jsonResponse({ error: updateErr?.message ?? "No se pudo activar la cuenta" }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
