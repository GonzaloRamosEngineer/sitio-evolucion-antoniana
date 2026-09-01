// =============================================================================
// Club — las reglas que deciden si un canje se puede generar, y por cuánto.
// =============================================================================
// Este archivo NO importa Deno, ni Supabase, ni nada del proyecto: son funciones
// puras. Por eso se puede testear con vitest (`club-reglas.test.ts`) sin levantar
// el runtime de Edge Functions, que es lo único que hoy no se puede probar.
//
// Vive dentro del módulo `club_` a propósito (ROADMAP 12.7 regla 6): viaja con
// las Edge Functions cuando el módulo se copia a otro proyecto.
// =============================================================================

export type Ventana = "dia" | "semana" | "mes" | "total";
export type TipoBeneficio = "porcentaje" | "monto_fijo" | "2x1" | "regalo";

export interface Beneficio {
  tipo: TipoBeneficio;
  valor: number | null;
  limite_por_persona: number | null;
  ventana: Ventana | null;
  vigencia_desde: string | null; // YYYY-MM-DD
  vigencia_hasta: string | null;
  dias_semana: number[] | null; // 0 = domingo
  hora_desde: string | null; // HH:MM[:SS]
  hora_hasta: string | null;
}

// -----------------------------------------------------------------------------
// EL HUSO HORARIO NO ES UN DETALLE.
//
// Postgres corre en UTC. Si "un canje por día" se calculara en UTC, en Argentina
// (UTC-3) el día se reiniciaría a las 21:00 hora local: alguien que canjea a las
// 20:30 y a las 21:30 estaría usando "dos días distintos", y el mostrador vería
// dos descuentos donde el beneficio prometía uno.
//
// Por eso todo lo que dependa del calendario o del reloj —la ventana del límite,
// la vigencia, los días de la semana y el horario— se calcula en la zona de la
// entidad, que sale de `club_config.zona_horaria` (12.7 regla 4).
// -----------------------------------------------------------------------------

/** Partes de fecha/hora locales, sin arrastrar una librería de fechas. */
function partesLocales(ahora: Date, zona: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const parte of fmt.formatToParts(ahora)) p[parte.type] = parte.value;

  // `en-CA` devuelve el día de la semana en inglés abreviado; se mapea a 0-6 con
  // domingo = 0, que es lo que guarda `club_beneficios.dias_semana`.
  const dias: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}:${p.second}`,
    diaSemana: dias[p.weekday] ?? 0,
    anio: Number(p.year),
    mes: p.month,
  };
}

/** Lunes de la semana ISO que contiene `fecha` (YYYY-MM-DD), como YYYY-MM-DD. */
function lunesDeLaSemana(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  // Se opera en UTC a propósito: `fecha` ya es la fecha LOCAL, así que acá solo
  // se hace aritmética de calendario y meterle huso otra vez la correría un día.
  const t = new Date(Date.UTC(a, m - 1, d));
  const dow = t.getUTCDay(); // 0 = domingo
  const desplazamiento = dow === 0 ? -6 : 1 - dow; // ISO: la semana arranca lunes
  t.setUTCDate(t.getUTCDate() + desplazamiento);
  return t.toISOString().slice(0, 10);
}

/**
 * La clave de deduplicación que va a `club_canjes.clave_limite`.
 *
 * Devuelve `null` —y entonces la base NO pone red— cuando el beneficio no tiene
 * límite o cuando permite más de uno por ventana. Ese caso hay que CONTARLO, y
 * el conteo vive en la Edge Function (ver el comentario del índice parcial en la
 * migración 20260830190000).
 */
export function claveLimite(
  beneficio: Pick<Beneficio, "limite_por_persona" | "ventana">,
  ahora: Date,
  zona: string,
): string | null {
  const { limite_por_persona: limite, ventana } = beneficio;
  if (limite !== 1 || !ventana) return null;

  const { fecha, anio, mes } = partesLocales(ahora, zona);
  switch (ventana) {
    case "dia":
      return `dia:${fecha}`;
    case "semana":
      return `semana:${lunesDeLaSemana(fecha)}`;
    case "mes":
      return `mes:${anio}-${mes}`;
    case "total":
      return "total";
  }
}

/**
 * Desde cuándo contar los canjes de una ventana, para los beneficios con límite
 * mayor a 1. `null` = desde siempre (ventana 'total').
 */
export function ventanaDesde(ventana: Ventana, ahora: Date, zona: string): string | null {
  const { fecha, anio, mes } = partesLocales(ahora, zona);
  switch (ventana) {
    case "dia":
      return fecha;
    case "semana":
      return lunesDeLaSemana(fecha);
    case "mes":
      return `${anio}-${mes}-01`;
    case "total":
      return null;
  }
}

/**
 * El arranque de la ventana como INSTANTE (ISO en UTC), que es lo que hace falta
 * para comparar contra `club_canjes.created_at`, que es `timestamptz`.
 *
 * `ventanaDesde` devuelve una fecha local ('2026-08-30'); mandársela cruda a la
 * base la interpretaría como medianoche UTC y en Argentina contaría desde las
 * 21:00 del día anterior — tres horas de canjes ajenos metidos en la cuenta.
 *
 * Devuelve `null` para la ventana 'total' (contar desde siempre).
 */
export function inicioVentanaUTC(ventana: Ventana, ahora: Date, zona: string): string | null {
  const fechaLocal = ventanaDesde(ventana, ahora, zona);
  if (fechaLocal === null) return null;

  // Se calcula el desfase de la zona en esa fecha y se corrige. Argentina no
  // tiene horario de verano hoy; si alguna zona lo tuviera, el borde sería la
  // madrugada del cambio.
  const tentativo = new Date(`${fechaLocal}T00:00:00Z`);
  const enZona = new Date(tentativo.toLocaleString("en-US", { timeZone: zona }));
  const enUTC = new Date(tentativo.toLocaleString("en-US", { timeZone: "UTC" }));
  const desfase = enZona.getTime() - enUTC.getTime();
  return new Date(tentativo.getTime() - desfase).toISOString();
}

export interface Disponibilidad {
  ok: boolean;
  motivo?: string;
}

/**
 * ¿El beneficio se puede usar en este instante?
 *
 * Los motivos son texto para mostrarle a la persona: si el mostrador va a
 * rechazar el canje, la pantalla del socio tiene que decir por qué ANTES de que
 * lo intente. Pasar vergüenza en la caja es la forma más rápida de perder un
 * socio (12.3, casos borde).
 */
export function disponibleAhora(
  beneficio: Beneficio,
  ahora: Date,
  zona: string,
): Disponibilidad {
  const { fecha, hora, diaSemana } = partesLocales(ahora, zona);

  if (beneficio.vigencia_desde && fecha < beneficio.vigencia_desde) {
    return { ok: false, motivo: `Este beneficio arranca el ${beneficio.vigencia_desde}.` };
  }
  if (beneficio.vigencia_hasta && fecha > beneficio.vigencia_hasta) {
    return { ok: false, motivo: "Este beneficio ya terminó." };
  }
  if (beneficio.dias_semana?.length && !beneficio.dias_semana.includes(diaSemana)) {
    return { ok: false, motivo: "Este beneficio no está disponible hoy." };
  }

  // Se comparan como texto HH:MM:SS, que ordena igual que el reloj. `hora_desde`
  // puede venir del driver como 'HH:MM' o 'HH:MM:SS'; se normaliza a 8 caracteres.
  const hhmmss = (h: string) => (h.length === 5 ? `${h}:00` : h).slice(0, 8);
  if (beneficio.hora_desde && hora < hhmmss(beneficio.hora_desde)) {
    return { ok: false, motivo: `Disponible desde las ${beneficio.hora_desde.slice(0, 5)}.` };
  }
  if (beneficio.hora_hasta && hora > hhmmss(beneficio.hora_hasta)) {
    return { ok: false, motivo: `Disponible hasta las ${beneficio.hora_hasta.slice(0, 5)}.` };
  }

  return { ok: true };
}

/**
 * Cuánto se ahorró, si se puede saber.
 *
 * `null` NO es cero: es "no calculable". Un 2x1 o un regalo dependen de qué se
 * llevó la persona, y el sistema no lo sabe. Guardar 0 ahí mentiría en el
 * reporte que después se le muestra al comercio para que renueve (12.6).
 */
export function calcularAhorro(
  beneficio: Pick<Beneficio, "tipo" | "valor">,
  montoOperacion: number | null | undefined,
): number | null {
  if (montoOperacion == null || !Number.isFinite(montoOperacion) || montoOperacion < 0) {
    return null;
  }
  switch (beneficio.tipo) {
    case "porcentaje":
      if (beneficio.valor == null) return null;
      return Math.round(montoOperacion * (beneficio.valor / 100) * 100) / 100;
    case "monto_fijo":
      if (beneficio.valor == null) return null;
      // No se puede ahorrar más de lo que se gastó.
      return Math.min(beneficio.valor, montoOperacion);
    case "2x1":
    case "regalo":
      return null;
  }
}
