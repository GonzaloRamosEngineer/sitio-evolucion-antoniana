// =============================================================================
// Club — lo que las tres Edge Functions necesitan hacer siempre igual.
// =============================================================================
// Identidad del invocador, config del módulo y pertenencia al comercio.
//
// La regla que se repite en los tres archivos y que viene del patrón de
// `create-user`: LA AUTORIZACIÓN NO SE LEE DEL JWT NI DEL BODY. El JWT sirve
// para saber QUIÉN dice ser el invocador; lo que ese invocador tiene permitido
// se lee de la base con `service_role`.
//
// Portabilidad (12.7 regla 5): acá no se toca nada fuera del prefijo `club_`,
// salvo `users` —para el rol— y la función de elegibilidad `tiene_acceso`.
// =============================================================================
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Contexto {
  callerId: string;
  admin: SupabaseClient;
}

export class ErrorHttp extends Error {
  /**
   * `codigo` viaja al front para que la pantalla pueda ACTUAR, no solo mostrar
   * texto. Sin él, un 401 por sesión vencida y un 500 por config rota se ven
   * iguales desde el browser, y la única salida que se le puede ofrecer a la
   * persona es «probar de nuevo» — que en el primer caso falla para siempre.
   */
  constructor(public status: number, message: string, public codigo?: string) {
    super(message);
  }
}

/** Resuelve quién invoca y devuelve además el cliente con `service_role`. */
export async function contextoDesde(req: Request): Promise<Contexto> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    // Sin esto el módulo emitiría canjes contra vaya a saber qué base, o
    // fallaría con un error que no dice nada. Mismo criterio que la guarda de
    // `src/lib/supabase.js`: fallar ruidoso.
    throw new ErrorHttp(500, "Configuración del servidor incompleta", "config");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new ErrorHttp(401, "Iniciá sesión para usar tus beneficios.", "sesion");

  const comoInvocador = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await comoInvocador.auth.getUser();
  if (error || !user) throw new ErrorHttp(401, "Tu sesión no está activa. Iniciá sesión y probá de nuevo.", "sesion");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { callerId: user.id, admin };
}

/** `club_config` como objeto plano. Ningún parámetro se hardcodea (12.7 regla 4). */
export async function leerConfig(admin: SupabaseClient): Promise<Record<string, unknown>> {
  const { data, error } = await admin.from("club_config").select("clave, valor");
  if (error) throw new ErrorHttp(500, "No se pudo leer la configuración del club");
  const cfg: Record<string, unknown> = {};
  for (const fila of data ?? []) cfg[fila.clave as string] = fila.valor;
  return cfg;
}

export function num(cfg: Record<string, unknown>, clave: string, porDefecto: number): number {
  const v = cfg[clave];
  return typeof v === "number" && Number.isFinite(v) ? v : porDefecto;
}

export function texto(cfg: Record<string, unknown>, clave: string, porDefecto: string): string {
  const v = cfg[clave];
  return typeof v === "string" && v.length > 0 ? v : porDefecto;
}

/** ¿El invocador opera este comercio? Se lee de la tabla, no del JWT. */
export async function operaElComercio(
  admin: SupabaseClient,
  comercioId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("club_comercio_usuarios")
    .select("rol")
    .eq("comercio_id", comercioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ErrorHttp(500, "No se pudo verificar la pertenencia al comercio");
  return Boolean(data);
}

/** admin o comisión directiva. Mismo criterio que `is_board_member()` en SQL. */
export async function esComision(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new ErrorHttp(500, "No se pudo verificar el rol");
  return data?.role === "admin" || data?.role === "comision_directiva";
}

/**
 * El beneficio con su comercio, tal como lo necesitan las tres funciones.
 * Devuelve `null` si no existe.
 */
export async function beneficioConComercio(admin: SupabaseClient, beneficioId: string) {
  const { data, error } = await admin
    .from("club_beneficios")
    .select(
      "id, comercio_id, titulo, tipo, valor, requiere_acceso, estado, " +
        "limite_por_persona, ventana, limite_total, stock, " +
        "vigencia_desde, vigencia_hasta, dias_semana, hora_desde, hora_hasta, " +
        // Requisitos y tope (§12.11). Si faltan acá, `cumpleRequisitos()` los ve
        // como null y NO exige nada: la protección se caería en silencio.
        "antiguedad_minima_meses, aporte_minimo_acumulado, ahorro_maximo, " +
        "club_comercios!inner(id, nombre, estado)",
    )
    .eq("id", beneficioId)
    .maybeSingle();
  if (error) throw new ErrorHttp(500, "No se pudo leer el beneficio");
  return data;
}
