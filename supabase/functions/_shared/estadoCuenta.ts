// Estado de cuenta para MatchBot («Mi aporte» por WhatsApp).
//
// Cuando una persona escribe al WhatsApp de la entidad, MatchBot pregunta acá por el
// número QUE ESCRIBE (el que firma Meta, nunca uno que diga el mensaje) y le responde
// con datos reales. Es el mismo contrato (`account_status_http`) que ya usa DMG Ops.
//
// AUTENTICACIÓN: `x-matchbot-timestamp` + `x-matchbot-signature: v1=hex(HMAC-SHA256(secreto,
// "<ts>.<cuerpo>"))`, con un secreto PROPIO de esta consulta (`ESTADO_CUENTA_SECRET`,
// ≥ 32 caracteres). Falla cerrada. No hay usuario ni JWT: es de servicio a servicio.
//
// QUIÉN DECIDE QUÉ SE DEVUELVE: la base (`account_status_for_phone`). Esta función sólo
// autentica, valida la forma del pedido y completa los enlaces. No toca la lógica de
// acceso ni conoce a las personas.
//
// Este archivo NO importa nada de Deno a propósito: toda la lógica que decide algo vive
// acá, para que `vitest` la pueda probar. El `index.ts` es pegamento.
import { RUTAS_EXTERNAS, urlDelSitio } from "./rutas.ts";

const MAX_BODY = 2048;
const SKEW_SECONDS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EstadoCuentaDeps = {
  secret: string;
  /** Origen público del sitio de la entidad, para armar los enlaces de renovación. */
  sitio: string;
  /** `chargeIds`: ids de cobros de los mensajes automáticos recientes (esta entidad no los usa). */
  accountStatus: (phone: string, chargeIds: string[]) => Promise<unknown>;
  now?: () => number;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signEstadoCuenta(secret: string, ts: string, rawBody: string): Promise<string> {
  return `v1=${await hmacHex(secret, `${ts}.${rawBody}`)}`;
}

/** Comparación en tiempo constante: no filtra, por tiempo de respuesta, cuánto de la firma acertó. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * La base devuelve los cobros abiertos sin enlace (no conoce el sitio). Acá se les pone el
 * destino canónico de renovación, armado con las rutas y el dominio de la entidad: así no
 * hay un dominio ni una ruta escritos a mano en SQL. Sólo completa lo que viene vacío.
 */
export function completarEnlaces(status: any, sitio: string): any {
  if (!status || status.found !== true || !Array.isArray(status.open_charges)) return status;
  const renovar = urlDelSitio(sitio, RUTAS_EXTERNAS.COLABORAR);
  const cuenta = urlDelSitio(sitio, RUTAS_EXTERNAS.CUENTA);
  return {
    ...status,
    open_charges: status.open_charges.map((c: any) => ({
      ...c,
      payment_url: c?.payment_url ?? renovar,
      payment_details: c?.payment_details ?? `Podés renovar tu aporte desde la web o consultar el estado en ${cuenta}`,
    })),
  };
}

export async function handleEstadoCuenta(req: Request, d: EstadoCuentaDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  if (!d.secret || d.secret.length < 32) return json(503, { ok: false, error: "not_configured" });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return json(413, { ok: false, error: "request_too_large" });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) return json(413, { ok: false, error: "request_too_large" });

  const ts = req.headers.get("x-matchbot-timestamp") ?? "";
  const sig = req.headers.get("x-matchbot-signature") ?? "";
  if (!/^\d{9,11}$/.test(ts) || !sig) return json(401, { ok: false, error: "unauthorized" });
  const nowS = Math.floor((d.now ? d.now() : Date.now()) / 1000);
  if (Math.abs(nowS - Number(ts)) > SKEW_SECONDS) return json(401, { ok: false, error: "stale_timestamp" });
  if (!sameString(sig, await signEstadoCuenta(d.secret, ts, raw))) return json(401, { ok: false, error: "unauthorized" });

  let body: any;
  try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "invalid_json" }); }
  if (body?.action !== "account_status") return json(400, { ok: false, error: "unknown_action" });
  const phone = String(body?.phone ?? "");
  if (!/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ""))) return json(400, { ok: false, error: "invalid_phone" });

  const chargeIds = (Array.isArray(body?.charge_ids) ? body.charge_ids : [])
    .filter((v: unknown) => typeof v === "string" && UUID.test(v)).slice(0, 5);

  try {
    const status = await d.accountStatus(phone, chargeIds);
    return json(200, { ok: true, tool: "account.status", status: completarEnlaces(status, d.sitio) });
  } catch {
    // Sin detalle y sin el teléfono: un error de la base no tiene por qué viajar hasta el bot.
    return json(503, { ok: false, error: "unavailable" });
  }
}
