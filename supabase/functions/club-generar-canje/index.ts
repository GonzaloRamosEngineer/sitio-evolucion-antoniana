// =============================================================================
// Edge Function: club-generar-canje  (ROADMAP §12.2, §12.5)
// =============================================================================
// El socio pulsa "usar beneficio" y esto emite el canje en estado 'pendiente':
// un código de 6 caracteres con vencimiento corto. NO hay tabla de tokens — el
// token ES el canje pendiente.
//
// POR QUÉ ESTO NO PUEDE VIVIR EN EL BROWSER: `club_canjes` otorga valor
// económico, y del otro lado hay un comercio esperando que le paguen. Si el
// insert saliera con la anon key, cualquiera con las devtools se autogenera
// canjes confirmados. Por eso la tabla no tiene policy de INSERT y esto corre
// con `service_role`.
//
// Invocar: supabase.functions.invoke('club-generar-canje',
//            { body: { beneficio_id, sucursal_id? } })
// Deploy:  supabase functions deploy club-generar-canje
// =============================================================================
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  ErrorHttp,
  beneficioConComercio,
  contextoDesde,
  leerConfig,
  num,
  texto,
} from "../_shared/club-db.ts";
import {
  claveLimite,
  disponibleAhora,
  inicioVentanaUTC,
  type Beneficio,
  type Ventana,
} from "../_shared/club-reglas.ts";

// Cuántas veces reintentar si el código sorteado ya existía. Con 31^6 ≈ 887
// millones de combinaciones esto no debería pasar nunca; está por las dudas y
// para que, si pasa, no se pierda el canje.
const INTENTOS_CODIGO = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  try {
    const { callerId, admin } = await contextoDesde(req);

    const body = await req.json().catch(() => null);
    const beneficioId = body?.beneficio_id;
    const sucursalId = body?.sucursal_id ?? null;
    if (typeof beneficioId !== "string" || !beneficioId) {
      return jsonResponse({ error: "Falta beneficio_id" }, 422);
    }

    const cfg = await leerConfig(admin);
    const zona = texto(cfg, "zona_horaria", "America/Argentina/Buenos_Aires");
    const ttlMin = num(cfg, "canje_ttl_minutos", 5);
    const ahora = new Date();

    // ---- 1) El beneficio existe y está publicado -----------------------------
    const beneficio = await beneficioConComercio(admin, beneficioId);
    if (!beneficio) return jsonResponse({ error: "Ese beneficio no existe" }, 404);

    const comercio = (beneficio as Record<string, any>).club_comercios;
    if (beneficio.estado !== "activo" || comercio?.estado !== "activo") {
      return jsonResponse({ error: "Ese beneficio no está disponible" }, 409);
    }

    // ---- 2) Elegibilidad -----------------------------------------------------
    // El club NUNCA sabe POR QUÉ alguien es elegible (12.7 regla 1): pregunta y
    // punto. En otro proyecto esta función puede ser `select true`.
    if (beneficio.requiere_acceso) {
      const { data: tieneAcceso, error: accErr } = await admin.rpc("tiene_acceso", {
        p_user_id: callerId,
      });
      if (accErr) return jsonResponse({ error: "No se pudo verificar tu acceso" }, 500);
      if (!tieneAcceso) {
        // 403 y no 401: la sesión es válida, lo que falta es el aporte vigente.
        return jsonResponse(
          { error: "Este beneficio es para socios con acceso vigente.", codigo_error: "sin_acceso" },
          403,
        );
      }
    }

    // ---- 3) Día, horario y vigencia -----------------------------------------
    const disp = disponibleAhora(beneficio as unknown as Beneficio, ahora, zona);
    if (!disp.ok) return jsonResponse({ error: disp.motivo, codigo_error: "fuera_de_ventana" }, 409);

    // ---- 4) La sucursal, si vino, tiene que ser de ESTE comercio -------------
    if (sucursalId) {
      const { data: suc, error: sucErr } = await admin
        .from("club_sucursales")
        .select("id")
        .eq("id", sucursalId)
        .eq("comercio_id", beneficio.comercio_id)
        .eq("activa", true)
        .maybeSingle();
      if (sucErr) return jsonResponse({ error: "No se pudo verificar la sucursal" }, 500);
      if (!suc) return jsonResponse({ error: "Esa sucursal no corresponde al comercio" }, 422);
    }

    // ---- 5) Stock y tope global ---------------------------------------------
    // Se cuentan los confirmados: un pendiente todavía no consumió nada, y un
    // expirado no consumió nunca.
    if (beneficio.limite_total != null || beneficio.stock != null) {
      const { count, error: cErr } = await admin
        .from("club_canjes")
        .select("id", { count: "exact", head: true })
        .eq("beneficio_id", beneficioId)
        .eq("estado", "confirmado");
      if (cErr) return jsonResponse({ error: "No se pudo verificar el stock" }, 500);
      const usados = count ?? 0;
      const tope = Math.min(
        beneficio.limite_total ?? Number.POSITIVE_INFINITY,
        beneficio.stock ?? Number.POSITIVE_INFINITY,
      );
      if (usados >= tope) {
        return jsonResponse({ error: "Este beneficio se agotó.", codigo_error: "agotado" }, 409);
      }
    }

    // ---- 6) Límite por persona ----------------------------------------------
    // Con límite 1 la clave va a la fila y el índice único de la base hace de
    // red (el doble clic gana carreras que un chequeo previo no puede). Con
    // límite mayor hay que contar, y ahí no hay red: ver el comentario del
    // índice en la migración 20260830190000.
    const clave = claveLimite(beneficio as unknown as Beneficio, ahora, zona);

    if (beneficio.limite_por_persona != null && beneficio.limite_por_persona > 1) {
      const desde = inicioVentanaUTC(beneficio.ventana as Ventana, ahora, zona);
      let q = admin
        .from("club_canjes")
        .select("id", { count: "exact", head: true })
        .eq("beneficio_id", beneficioId)
        .eq("user_id", callerId)
        .in("estado", ["pendiente", "confirmado"]);
      if (desde) q = q.gte("created_at", desde);
      const { count, error: lErr } = await q;
      if (lErr) return jsonResponse({ error: "No se pudo verificar tu límite" }, 500);
      if ((count ?? 0) >= beneficio.limite_por_persona) {
        return jsonResponse(
          { error: "Ya usaste este beneficio todas las veces permitidas.", codigo_error: "limite_alcanzado" },
          409,
        );
      }
    }

    // ---- 7) Emitir ----------------------------------------------------------
    const expiraEn = new Date(ahora.getTime() + ttlMin * 60_000).toISOString();

    for (let intento = 0; intento < INTENTOS_CODIGO; intento++) {
      const { data: codigo, error: codErr } = await admin.rpc("club_nuevo_codigo");
      if (codErr || typeof codigo !== "string") {
        return jsonResponse({ error: "No se pudo generar el código" }, 500);
      }

      const { data: canje, error: insErr } = await admin
        .from("club_canjes")
        .insert({
          beneficio_id: beneficioId,
          sucursal_id: sucursalId,
          user_id: callerId,
          codigo,
          estado: "pendiente",
          expira_en: expiraEn,
          clave_limite: clave,
        })
        .select("id, codigo, expira_en")
        .single();

      if (!insErr) {
        return jsonResponse({
          id: canje.id,
          codigo: canje.codigo,
          expira_en: canje.expira_en,
          ttl_segundos: ttlMin * 60,
          beneficio: { id: beneficio.id, titulo: beneficio.titulo, tipo: beneficio.tipo, valor: beneficio.valor },
          comercio: { id: comercio.id, nombre: comercio.nombre },
        });
      }

      // 23505 = unique_violation. Puede ser el código repetido (se reintenta) o
      // la RED DEL LÍMITE (no se reintenta: es la respuesta correcta).
      if (insErr.code === "23505") {
        if (insErr.message?.includes("idx_club_canjes_limite_persona")) {
          return jsonResponse(
            { error: "Ya usaste este beneficio.", codigo_error: "limite_alcanzado" },
            409,
          );
        }
        continue; // código repetido: sortear otro
      }
      console.error("club-generar-canje: insert falló", insErr);
      return jsonResponse({ error: "No se pudo generar el canje" }, 500);
    }

    return jsonResponse({ error: "No se pudo generar un código libre, probá de nuevo" }, 503);
  } catch (e) {
    if (e instanceof ErrorHttp) {
      return jsonResponse({ error: e.message, codigo_error: e.codigo }, e.status);
    }
    console.error("club-generar-canje: error inesperado", e);
    return jsonResponse({ error: "Error inesperado" }, 500);
  }
});
