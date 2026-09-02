// =============================================================================
// Edge Function: club-confirmar-canje  (ROADMAP §12.3, §12.5)
// =============================================================================
// El cajero escanea o tipea el código y confirma. Este es el momento en que el
// canje pasa de intención a hecho económico: a partir de acá el comercio puede
// reclamar que le manden gente, y la entidad tiene el número para negociar la
// renovación.
//
// Quién puede confirmar: SOLO alguien con fila en `club_comercio_usuarios` del
// comercio dueño del beneficio. Se lee de la tabla, nunca del JWT ni del body.
//
// ⚠️ EL TTL Y LA CONFIRMACIÓN DIFERIDA SE CONTRADICEN, Y ACÁ SE RESUELVE ASÍ.
// §12.3 pide dos cosas a la vez: que el código venza en 5 minutos (para que se
// genere EN la caja y no en el colectivo) y que el cajero pueda rescatar
// códigos de las últimas 2 h cuando el local se quedó sin señal. Si el rescate
// estuviera siempre disponible, el contador de 5 minutos sería decorativo.
//
// La resolución: el vencimiento es real —el canje pasa a 'expirado' y el socio
// ve que venció—, pero confirmar un canje ya vencido sigue siendo posible
// dentro de la ventana diferida. Queda registrado sin agregar ninguna columna:
// un canje con `confirmado_en > expira_en` FUE un rescate tardío, y eso se
// puede contar después para saber qué locales trabajan sin señal.
//
// Invocar: supabase.functions.invoke('club-confirmar-canje',
//            { body: { codigo, monto_operacion?, sucursal_id? } })
// =============================================================================
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  ErrorHttp,
  contextoDesde,
  leerConfig,
  num,
  operaElComercio,
} from "../_shared/club-db.ts";
import { calcularAhorro } from "../_shared/club-reglas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  try {
    const { callerId, admin } = await contextoDesde(req);

    const body = await req.json().catch(() => null);
    const codigo = typeof body?.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
    if (!/^[2-9A-HJKMNP-Z]{6}$/.test(codigo)) {
      // El alfabeto no tiene 0/O ni 1/I/L: un código con esos caracteres es un
      // error de tipeo del cajero, y conviene decirlo antes de buscar en la base.
      return jsonResponse({ error: "Ese código no tiene el formato correcto", codigo_error: "formato" }, 422);
    }

    const cfg = await leerConfig(admin);
    const diferidaHs = num(cfg, "confirmacion_diferida_horas", 2);
    const montoObligatorio = cfg["monto_operacion_obligatorio"] === true;
    const ahora = new Date();

    // ---- 1) Buscar el canje --------------------------------------------------
    const { data: canje, error: findErr } = await admin
      .from("club_canjes")
      .select(
        "id, estado, expira_en, created_at, user_id, beneficio_id, sucursal_id, " +
          "club_beneficios!inner(id, comercio_id, titulo, tipo, valor), " +
          "users!club_canjes_user_id_fkey(name)",
      )
      .eq("codigo", codigo)
      .maybeSingle();
    if (findErr) {
      console.error("club-confirmar-canje: error buscando", findErr);
      return jsonResponse({ error: "No se pudo buscar el código" }, 500);
    }
    if (!canje) return jsonResponse({ error: "Ese código no existe", codigo_error: "inexistente" }, 404);

    const beneficio = (canje as Record<string, any>).club_beneficios;

    // ---- 2) ¿Este cajero puede confirmar ESTE canje? -------------------------
    // Antes que cualquier otra cosa: si no es de su comercio, no tiene por qué
    // enterarse siquiera del estado del canje.
    const puede = await operaElComercio(admin, beneficio.comercio_id, callerId);
    if (!puede) {
      return jsonResponse({ error: "Este código no es de tu comercio", codigo_error: "ajeno" }, 403);
    }

    // ---- 3) Estado ----------------------------------------------------------
    if (canje.estado === "confirmado") {
      // Idempotencia amable: el cajero apretó dos veces. No es un error.
      return jsonResponse({ ya_estaba: true, mensaje: "Este canje ya estaba confirmado." });
    }
    if (canje.estado === "anulado") {
      return jsonResponse({ error: "Este canje fue anulado", codigo_error: "anulado" }, 409);
    }

    const limiteRescate = new Date(ahora.getTime() - diferidaHs * 3_600_000);
    if (new Date(canje.created_at) < limiteRescate) {
      return jsonResponse(
        {
          error: `Este código venció hace más de ${diferidaHs} h. El socio tiene que generar uno nuevo.`,
          codigo_error: "vencido",
        },
        409,
      );
    }
    const esRescateTardio = new Date(canje.expira_en) < ahora;

    // ---- 4) Monto de la operación -------------------------------------------
    const montoCrudo = body?.monto_operacion;
    const monto = montoCrudo == null || montoCrudo === "" ? null : Number(montoCrudo);
    if (monto !== null && (!Number.isFinite(monto) || monto < 0)) {
      return jsonResponse({ error: "El monto no es válido", codigo_error: "monto" }, 422);
    }
    if (montoObligatorio && monto === null) {
      return jsonResponse({ error: "Falta el monto de la operación", codigo_error: "monto_requerido" }, 422);
    }

    const ahorro = calcularAhorro({ tipo: beneficio.tipo, valor: beneficio.valor }, monto);

    // ---- 5) Confirmar -------------------------------------------------------
    // El UPDATE lleva el estado en el WHERE a propósito: si dos cajeros del
    // mismo local confirman a la vez, el segundo afecta 0 filas en vez de pisar
    // los datos del primero. La carrera la resuelve la base, no el orden.
    const { data: filas, error: upErr } = await admin
      .from("club_canjes")
      .update({
        estado: "confirmado",
        cajero_id: callerId,
        confirmado_en: ahora.toISOString(),
        monto_operacion: monto,
        ahorro,
        // Si el socio no eligió sucursal al generar, se toma la que informa el
        // cajero: el dato sirve para el reporte por local (12.6).
        ...(canje.sucursal_id == null && typeof body?.sucursal_id === "string"
          ? { sucursal_id: body.sucursal_id }
          : {}),
      })
      .eq("id", canje.id)
      .in("estado", ["pendiente", "expirado"])
      .select("id, confirmado_en, ahorro");

    if (upErr) {
      // 23505 acá significa que el socio ya tiene OTRO canje vivo del mismo
      // beneficio en la misma ventana: éste venció, generó uno nuevo, y ahora
      // se está intentando rescatar el viejo. Confirmar los dos sería regalar
      // dos veces el mismo beneficio.
      if (upErr.code === "23505") {
        return jsonResponse(
          { error: "El socio ya generó otro canje de este beneficio. Usá ese.", codigo_error: "reemplazado" },
          409,
        );
      }
      console.error("club-confirmar-canje: update falló", upErr);
      return jsonResponse({ error: "No se pudo confirmar" }, 500);
    }
    if (!filas || filas.length === 0) {
      return jsonResponse({ ya_estaba: true, mensaje: "Este canje ya fue procesado." });
    }

    return jsonResponse({
      ok: true,
      id: filas[0].id,
      confirmado_en: filas[0].confirmado_en,
      ahorro: filas[0].ahorro,
      rescate_tardio: esRescateTardio,
      socio: (canje as Record<string, any>).users?.name ?? null,
      beneficio: { id: beneficio.id, titulo: beneficio.titulo },
    });
  } catch (e) {
    if (e instanceof ErrorHttp) {
      return jsonResponse({ error: e.message, codigo_error: e.codigo }, e.status);
    }
    console.error("club-confirmar-canje: error inesperado", e);
    return jsonResponse({ error: "Error inesperado" }, 500);
  }
});
