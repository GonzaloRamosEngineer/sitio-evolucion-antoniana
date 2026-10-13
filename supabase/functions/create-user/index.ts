// =============================================================================
// Edge Function: create-user
// =============================================================================
// Crea un usuario completo (auth + perfil en public.users) con un rol asignado
// y le envía un enlace para que defina su propia contraseña. Está pensada para
// que un ADMIN dé de alta cuentas sin perder su propia sesión.
//
// Seguridad:
//  - La autorización NO confía en el body ni en metadata del JWT: lee el rol del
//    invocador desde public.users usando la service_role.
//  - La service_role key vive solo en el servidor (Edge runtime la inyecta como
//    env var); nunca llega al browser.
//
// Deploy:  supabase functions deploy create-user
// Invocar: supabase.functions.invoke('create-user', { body: {...} })
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const VALID_ROLES = [
  "admin",
  "user",
  "educacion_manager",
  "comision_directiva",
  "documentacion_lectura",
];

Deno.serve(async (req) => {
  // 1) Preflight CORS
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

    // 2) Validar que viene un JWT de usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Falta token de autorización" }, 401);
    }

    // Cliente "como el invocador": resuelve SU identidad a partir del JWT.
    const supabaseCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await supabaseCaller.auth.getUser();

    if (callerErr || !caller) {
      return jsonResponse({ error: "Sesión inválida" }, 401);
    }

    // Cliente admin (service_role): bypassa RLS para validar rol y crear la cuenta.
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3) Autorización real: el invocador debe ser admin (leído de la DB).
    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profErr || callerProfile?.role !== "admin") {
      return jsonResponse({ error: "No autorizado: se requiere rol admin" }, 403);
    }

    // 4) Validar input
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim()?.toLowerCase();
    const name = body?.name?.trim();
    const role = body?.role;

    if (!email || !name || !role) {
      return jsonResponse(
        { error: "Faltan campos obligatorios: email, name, role" },
        400,
      );
    }
    if (!VALID_ROLES.includes(role)) {
      return jsonResponse({ error: `Rol inválido: ${role}` }, 400);
    }
    // 5) Crear la cuenta confirmada con una clave aleatoria de un solo uso.
    // La persona nunca recibe ni usa esta clave: el enlace de activación le
    // permite elegir la suya antes de iniciar sesión.
    const initialPassword = `${crypto.randomUUID()}!A1`;
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: { name, role },
      });

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "No se pudo crear la cuenta";
      const status = /already|exist|registered/i.test(msg) ? 409 : 400;
      return jsonResponse({ error: msg }, status);
    }

    const newUserId = created.user.id;

    // 6) Upsert del perfil con el rol correcto. upsert por si un trigger
    //    handle_new_user ya creó la fila con role 'user'.
    const { error: upsertErr } = await supabaseAdmin
      .from("users")
      .upsert(
        { id: newUserId, email, name, role, is_verified: true },
        { onConflict: "id" },
      );

    if (upsertErr) {
      // Rollback: sin perfil, la cuenta queda huérfana → la borramos.
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return jsonResponse(
        { error: `No se pudo crear el perfil: ${upsertErr.message}` },
        500,
      );
    }

    // 7) Enviar el email de activación usando el SMTP configurado en Supabase.
    // El enlace abre /update-password, que ya maneja sesiones de recovery y
    // deja a la persona elegir su contraseña sin conocer ninguna clave previa.
    const { error: inviteErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: "https://www.evolucionantoniana.com/update-password",
    });

    if (inviteErr) {
      // No dejamos una cuenta creada sin que su destinatario pueda activarla.
      await supabaseAdmin.from("users").delete().eq("id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return jsonResponse(
        { error: `No se pudo enviar el email de invitación: ${inviteErr.message}` },
        502,
      );
    }

    return jsonResponse(
      { ok: true, invitationSent: true, user: { id: newUserId, email, name, role } },
      201,
    );
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
