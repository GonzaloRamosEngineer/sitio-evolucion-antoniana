// =============================================================================
// Edge Function: club-invitar-operador  (ROADMAP §12.3, §12.10.4)
// =============================================================================
// Da de alta a quien va a atender el mostrador de un comercio y le manda el
// link para entrar. Cierra §12.10.4: hasta ahora, o el comercio se registraba
// solo en `/register` y alguien lo ataba a mano desde el ABM, o admin le creaba
// la cuenta y le pasaba la contraseña por fuera. Funcionaba, era artesanal, y
// §12.7 dice que el módulo tiene que poder operarse sin un desarrollador.
//
// ⚠️ SE DA DE ALTA EL DISPOSITIVO DEL LOCAL, NO A CADA EMPLEADO (§12.3). El
// cajero rota cada pocos meses y nadie va a crear una cuenta por empleado. Lo
// normal es una sola cuenta 'dueno' y, si el comercio tiene varios locales, una
// por local. Esta función no impide crear varias, pero ese es el uso previsto.
//
// QUIÉN PUEDE INVITAR: la comisión, o el 'dueno' de ESE comercio. Un 'cajero'
// no puede sumar gente a su propio mostrador — si pudiera, el permiso más bajo
// del módulo se podría multiplicar solo.
//
// POR QUÉ NO HAY ROL 'comercio' EN `users`: la pertenencia a
// `club_comercio_usuarios` ES el permiso (§12.5). Esta función NO toca
// `users.role`, y por eso invitar a alguien al mostrador no le da ningún
// privilegio en el resto del sitio.
//
// Invocar: supabase.functions.invoke('club-invitar-operador',
//            { body: { comercio_id, email, nombre?, rol? } })
// Deploy:  supabase functions deploy club-invitar-operador
// =============================================================================
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { ErrorHttp, contextoDesde, esComision } from "../_shared/club-db.ts";

const ROLES = ["dueno", "cajero"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  try {
    const { callerId, admin } = await contextoDesde(req);

    const body = await req.json().catch(() => null);
    const comercioId = typeof body?.comercio_id === "string" ? body.comercio_id : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const nombre = typeof body?.nombre === "string" && body.nombre.trim()
      ? body.nombre.trim()
      : null;
    const rol = ROLES.includes(body?.rol) ? body.rol : "cajero";

    if (!comercioId) return jsonResponse({ error: "Falta comercio_id" }, 422);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return jsonResponse({ error: "Ese email no es válido", codigo_error: "email" }, 422);
    }

    // ---- 1) Autorización: se lee de la base, nunca del body -----------------
    const { data: propio, error: propioErr } = await admin
      .from("club_comercio_usuarios")
      .select("rol")
      .eq("comercio_id", comercioId)
      .eq("user_id", callerId)
      .maybeSingle();
    if (propioErr) return jsonResponse({ error: "No se pudo verificar la pertenencia" }, 500);

    const esDueno = propio?.rol === "dueno";
    const esBoard = esDueno ? false : await esComision(admin, callerId);
    if (!esDueno && !esBoard) {
      return jsonResponse(
        { error: "No podés invitar operadores a este comercio", codigo_error: "ajeno" },
        403,
      );
    }

    // ---- 2) El comercio existe y no está dado de baja ------------------------
    const { data: comercio, error: comErr } = await admin
      .from("club_comercios")
      .select("id, nombre, estado")
      .eq("id", comercioId)
      .maybeSingle();
    if (comErr) return jsonResponse({ error: "No se pudo leer el comercio" }, 500);
    if (!comercio) return jsonResponse({ error: "Ese comercio no existe" }, 404);
    if (comercio.estado === "baja") {
      return jsonResponse(
        { error: "Ese comercio está dado de baja", codigo_error: "comercio_baja" },
        409,
      );
    }

    // ---- 3) ¿La cuenta ya existe? -------------------------------------------
    // Se busca en `public.users` y no en `auth.users` porque el perfil es el
    // que el resto del módulo usa, y `handle_new_user` garantiza que exista uno
    // por cada cuenta. Si algún día se desincronizaran, esto lo trataría como
    // cuenta nueva y `generateLink` fallaría con "already registered" — un
    // error legible, no una fila fantasma.
    const { data: existente, error: userErr } = await admin
      .from("users")
      .select("id, name")
      .eq("email", email)
      .maybeSingle();
    if (userErr) return jsonResponse({ error: "No se pudo buscar la cuenta" }, 500);

    // El redirect sale del Origin de quien invoca y no de una constante: §12.7
    // regla 3 no admite el dominio de la entidad escrito adentro del módulo, y
    // así el mismo código sirve en otro proyecto sin tocar una línea.
    // Supabase valida igual el destino contra su lista de redirects permitidos,
    // así que un Origin falseado no manda a nadie a ningún lado nuevo.
    const origen = req.headers.get("Origin") ?? Deno.env.get("SITE_URL") ?? "";
    const redirectTo = origen ? `${origen.replace(/\/+$/, "")}/comercio` : undefined;

    let userId = existente?.id ?? null;
    let actionLink: string | null = null;

    if (userId) {
      // Ya tiene cuenta: no se crea nada, se le manda un magic link. Mismo
      // criterio que `resend-verification`.
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (linkErr) return jsonResponse({ error: linkErr.message }, 500);
      actionLink = link?.properties?.action_link ?? null;
    } else {
      // Cuenta nueva. `name` es NOT NULL en `public.users` y `handle_new_user`
      // lo copia de la metadata: sin esto el alta falla y el motivo aparece
      // recién en los logs de la base.
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { name: nombre ?? comercio.nombre },
          ...(redirectTo ? { redirectTo } : {}),
        },
      });
      if (linkErr) return jsonResponse({ error: linkErr.message }, 500);
      actionLink = link?.properties?.action_link ?? null;
      userId = link?.user?.id ?? null;
    }

    if (!userId || !actionLink) {
      return jsonResponse({ error: "No se pudo generar la invitación" }, 500);
    }

    // ---- 4) Atarlo al comercio ----------------------------------------------
    // Va DESPUÉS de tener la cuenta y ANTES de mandar el mail: si el envío
    // falla, la persona igual quedó habilitada y el link se le puede pasar por
    // otro lado. Al revés —mandar el mail y fallar el vínculo— la invitación
    // llega y el mostrador no la deja entrar.
    const { error: atarErr } = await admin
      .from("club_comercio_usuarios")
      .upsert({ comercio_id: comercioId, user_id: userId, rol }, { onConflict: "comercio_id,user_id" });
    if (atarErr) {
      console.error("club-invitar-operador: no se pudo atar", atarErr);
      return jsonResponse({ error: "No se pudo asociar la cuenta al comercio" }, 500);
    }

    // ---- 5) Mandarlo -------------------------------------------------------
    // Sin Resend configurado se devuelve el link para compartirlo a mano, que
    // es lo que hoy hace `resend-verification`. Con comercios chicos el canal
    // real suele ser WhatsApp, así que esto no es un plan B degradado.
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL");

    if (RESEND_API_KEY && RESEND_FROM) {
      // Sin copy institucional adentro (§12.7 regla 3): lo único propio del
      // proyecto que aparece es el nombre del comercio, que es un dato.
      const html = `
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
        <body style="font-family:sans-serif;background:#f9fafb;padding:32px">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e5e7eb">
            <h2 style="color:#1e2a4a;margin:0 0 8px">Validá beneficios en ${comercio.nombre}</h2>
            <p style="color:#6b7280;margin:0 0 24px">
              Con este acceso vas a poder confirmar los códigos que te muestren en el mostrador.
              Dejá la pantalla abierta durante el turno.
            </p>
            <a href="${actionLink}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px">
              Entrar al mostrador
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">
              Este link es de un solo uso y expira en 1 hora.<br/>
              Si ya se venció, pedí uno nuevo y volvés a entrar.
            </p>
          </div>
        </body></html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [email],
          subject: `Acceso al mostrador de ${comercio.nombre}`,
          html,
        }),
      });

      if (res.ok) {
        return jsonResponse({ ok: true, enviado: true, email, user_id: userId, rol });
      }
      const detalle = await res.json().catch(() => ({}));
      // El link va igual: la persona ya quedó habilitada y lo que falló es el
      // correo. Devolver solo el error dejaría un operador atado y sin entrada.
      return jsonResponse({
        ok: true,
        enviado: false,
        email,
        user_id: userId,
        rol,
        link: actionLink,
        error_envio: detalle?.message ?? "No se pudo enviar el email",
      });
    }

    return jsonResponse({ ok: true, enviado: false, email, user_id: userId, rol, link: actionLink });
  } catch (e) {
    if (e instanceof ErrorHttp) {
      return jsonResponse({ error: e.message, codigo_error: e.codigo }, e.status);
    }
    console.error("club-invitar-operador: error inesperado", e);
    return jsonResponse({ error: "Error inesperado" }, 500);
  }
});
