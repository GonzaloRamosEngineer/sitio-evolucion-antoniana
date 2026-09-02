// =============================================================================
// Edge Function: club-anular-canje  (ROADMAP §12.3, §12.5)
// =============================================================================
// Se anuló la venta: el cajero anula el canje dentro de la ventana configurada.
//
// EL CANJE NO SE BORRA NUNCA. Pasa a 'anulado' y queda con quién lo anuló,
// cuándo y por qué. `club_canjes` es el libro contable del club (12.9.3): un
// borrado deja al comercio y a la entidad con números distintos y sin forma de
// saber cuál es el bueno.
//
// Quién puede anular:
//   - el comercio dueño del beneficio, dentro de la ventana;
//   - admin/comisión, TAMBIÉN FUERA de la ventana. Es el único camino para
//     arreglar un error viejo, y por eso queda registrado quién lo hizo.
//
// Invocar: supabase.functions.invoke('club-anular-canje',
//            { body: { codigo, motivo } })
// =============================================================================
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  ErrorHttp,
  contextoDesde,
  esComision,
  leerConfig,
  num,
  operaElComercio,
} from "../_shared/club-db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  try {
    const { callerId, admin } = await contextoDesde(req);

    const body = await req.json().catch(() => null);
    const codigo = typeof body?.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
    const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";
    if (!/^[2-9A-HJKMNP-Z]{6}$/.test(codigo)) {
      return jsonResponse({ error: "Ese código no tiene el formato correcto", codigo_error: "formato" }, 422);
    }
    // El motivo es obligatorio: una anulación sin motivo es indistinguible de un
    // error de operación, y es justo lo que después hay que poder auditar.
    if (motivo.length < 3) {
      return jsonResponse({ error: "Escribí el motivo de la anulación", codigo_error: "motivo" }, 422);
    }

    const cfg = await leerConfig(admin);
    const ventanaMin = num(cfg, "anulacion_ventana_minutos", 30);
    const ahora = new Date();

    const { data: canje, error: findErr } = await admin
      .from("club_canjes")
      .select("id, estado, confirmado_en, club_beneficios!inner(comercio_id, titulo)")
      .eq("codigo", codigo)
      .maybeSingle();
    if (findErr) {
      console.error("club-anular-canje: error buscando", findErr);
      return jsonResponse({ error: "No se pudo buscar el código" }, 500);
    }
    if (!canje) return jsonResponse({ error: "Ese código no existe", codigo_error: "inexistente" }, 404);

    const beneficio = (canje as Record<string, any>).club_beneficios;

    const esDelComercio = await operaElComercio(admin, beneficio.comercio_id, callerId);
    const esDeLaComision = esDelComercio ? false : await esComision(admin, callerId);
    if (!esDelComercio && !esDeLaComision) {
      return jsonResponse({ error: "Este código no es de tu comercio", codigo_error: "ajeno" }, 403);
    }

    if (canje.estado === "anulado") {
      return jsonResponse({ ya_estaba: true, mensaje: "Este canje ya estaba anulado." });
    }
    if (canje.estado !== "confirmado") {
      // Un pendiente no hay que anularlo: vence solo, y ese vencimiento es la
      // métrica de adopción del comercio (12.3).
      return jsonResponse(
        { error: "Solo se anulan canjes confirmados. Un pendiente vence solo.", codigo_error: "no_confirmado" },
        409,
      );
    }

    const minutosDesde = (ahora.getTime() - new Date(canje.confirmado_en).getTime()) / 60_000;
    if (minutosDesde > ventanaMin && !esDeLaComision) {
      return jsonResponse(
        {
          error: `La ventana para anular es de ${ventanaMin} minutos y ya pasó. Pedíselo a la Fundación.`,
          codigo_error: "fuera_de_ventana",
        },
        409,
      );
    }

    const { data: filas, error: upErr } = await admin
      .from("club_canjes")
      .update({
        estado: "anulado",
        anulado_en: ahora.toISOString(),
        anulado_por: callerId,
        motivo_anulacion: motivo,
      })
      .eq("id", canje.id)
      .eq("estado", "confirmado") // la carrera la resuelve la base
      .select("id, anulado_en");

    if (upErr) {
      console.error("club-anular-canje: update falló", upErr);
      return jsonResponse({ error: "No se pudo anular" }, 500);
    }
    if (!filas || filas.length === 0) {
      return jsonResponse({ ya_estaba: true, mensaje: "Este canje ya fue procesado." });
    }

    return jsonResponse({
      ok: true,
      id: filas[0].id,
      anulado_en: filas[0].anulado_en,
      por_la_comision: esDeLaComision,
      beneficio: { titulo: beneficio.titulo },
    });
  } catch (e) {
    if (e instanceof ErrorHttp) {
      return jsonResponse({ error: e.message, codigo_error: e.codigo }, e.status);
    }
    console.error("club-anular-canje: error inesperado", e);
    return jsonResponse({ error: "Error inesperado" }, 500);
  }
});
