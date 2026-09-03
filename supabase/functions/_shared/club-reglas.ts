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
  // Requisitos proporcionales al valor del beneficio (§12.11). Los tres son
  // opcionales: un beneficio sin ellos se comporta igual que antes de existir.
  antiguedad_minima_meses?: number | null;
  aporte_minimo_acumulado?: number | null;
  ahorro_maximo?: number | null;
}

/** Los HECHOS de la persona. Los da `elegibilidad_club()`; acá no se consultan. */
export interface Elegibilidad {
  tiene_acceso: boolean;
  meses_aportados: number;
  aporte_acumulado: number;
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
/**
 * ¿Esta persona cumple los requisitos de ESTE beneficio? (§12.11)
 *
 * POR QUÉ ESTO EXISTE. La regla de acceso es una sola para todo el sistema:
 * $5.000 dan un mes. Pero un 30% sobre desarrollo web vale entre $45.000 y
 * $150.000, así que con el umbral único **la estrategia óptima del socio era
 * aportar una vez, canjear e irse** — el club premiaba irse.
 *
 * La corrección NO es encarecer la cuota: la entidad la mantiene simbólica a
 * propósito, porque busca volumen de socios y no margen por socio. Lo que se
 * pide es TIEMPO. Entrada baratísima, y antigüedad para lo caro.
 *
 * LOS DOS CAMINOS SON OR, NO AND. Se cumple con la antigüedad **o** con el
 * aporte acumulado. Pedir los dos dejaría afuera al donante que pone una suma
 * grande de una vez, que es el que más aporta.
 *
 * Devuelve el motivo, no solo el veredicto: la pantalla necesita decir "te
 * faltan 3 meses" y no "no podés", que es lo que hace que alguien se quede.
 */
export function cumpleRequisitos(
  beneficio: Pick<
    Beneficio,
    "antiguedad_minima_meses" | "aporte_minimo_acumulado"
  >,
  elegibilidad: Elegibilidad | null | undefined,
): { ok: boolean; motivo?: string; codigo?: string; faltan_meses?: number; falta_monto?: number } {
  const minMeses = beneficio.antiguedad_minima_meses ?? null;
  const minMonto = beneficio.aporte_minimo_acumulado ?? null;

  // Sin requisitos declarados no hay nada que verificar.
  if (minMeses == null && minMonto == null) return { ok: true };

  const meses = Number(elegibilidad?.meses_aportados ?? 0);
  const monto = Number(elegibilidad?.aporte_acumulado ?? 0);

  const porAntiguedad = minMeses != null && meses >= minMeses;
  const porMonto = minMonto != null && monto >= minMonto;
  if (porAntiguedad || porMonto) return { ok: true };

  // No cumple. Se calcula lo que falta por CADA camino disponible, y se ofrece
  // el más cercano: decirle "te faltan 9 meses" a quien está a $5.000 de
  // llegar por monto es empujarlo a irse.
  const faltanMeses = minMeses != null ? Math.max(0, minMeses - meses) : null;
  const faltaMonto = minMonto != null ? Math.max(0, minMonto - monto) : null;

  /*
    ⚠️ EL MENSAJE DECÍA EL NÚMERO EQUIVOCADO. Era:

        `Este beneficio pide ${faltanMeses} meses de aporte o ${faltaMonto} ...`

    o sea la palabra «pide» seguida de **lo que FALTA**. Con el umbral real
    —6 meses o $30.000— y alguien que va por 1 mes, decía «este beneficio pide
    5 meses de aporte o 25.000 de aporte acumulado»: **anuncia un requisito
    que no existe**, y encima el monto sin el `$`.

    Y el test tampoco: asertaba `/4 meses/` y `/20.000/`, que son justamente
    los números del hueco. Le daba la razón al defecto (§11.4), igual que pasó
    con `faltaParaBeneficio` en el front el mismo día.

    Ahora dice las TRES cosas que hacen falta —qué pide, dónde estás, cuánto
    falta— con la misma redacción que `mensajeRequisitos()` en `src/lib/club.js`,
    para que la persona lea la misma frase la anuncie la pantalla o la rechace
    la función.
  */
  const plata = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const enMeses = (n: number) => `${n} ${n === 1 ? "mes" : "meses"}`;

  const pide: string[] = [];
  const vas: string[] = [];
  const restan: string[] = [];
  if (minMeses != null) {
    pide.push(`${enMeses(minMeses)} de aporte`);
    vas.push(enMeses(meses));
    restan.push(enMeses(faltanMeses as number));
  }
  if (minMonto != null) {
    pide.push(`${plata(minMonto)} en total`);
    vas.push(plata(monto));
    restan.push(plata(faltaMonto as number));
  }
  const verbo = faltanMeses === 1 ? "falta" : "faltan";

  return {
    ok: false,
    codigo: "requisitos",
    motivo:
      `Este beneficio pide ${pide.join(" o ")}. ` +
      `Vas por ${vas.join(" y ")}, así que te ${verbo} ${restan.join(" o ")}.`,
    ...(faltanMeses != null ? { faltan_meses: faltanMeses } : {}),
    ...(faltaMonto != null ? { falta_monto: faltaMonto } : {}),
  };
}

export function calcularAhorro(
  beneficio: Pick<Beneficio, "tipo" | "valor" | "ahorro_maximo">,
  montoOperacion: number | null | undefined,
): number | null {
  if (montoOperacion == null || !Number.isFinite(montoOperacion) || montoOperacion < 0) {
    return null;
  }

  // El tope se aplica AL FINAL y sobre cualquier tipo: "30% OFF hasta $30.000"
  // es lo que acota la exposición del comercio, y es lo que hace que un tercero
  // acepte entrar (§12.11). Un 30% sin tope sobre una cotización de $500.000
  // son $150.000 que salen de su bolsillo en un solo canje.
  //
  // ⚠️ Se aplica al AHORRO, no al monto de la operación. Toparlo antes daría
  // "30% de los primeros $30.000" = $9.000, que es otra cosa y mucho menos.
  const tope = beneficio.ahorro_maximo ?? null;
  const conTope = (bruto: number | null) =>
    bruto == null || tope == null ? bruto : Math.min(bruto, tope);

  switch (beneficio.tipo) {
    case "porcentaje":
      if (beneficio.valor == null) return null;
      return conTope(Math.round(montoOperacion * (beneficio.valor / 100) * 100) / 100);
    case "monto_fijo":
      if (beneficio.valor == null) return null;
      // No se puede ahorrar más de lo que se gastó.
      return conTope(Math.min(beneficio.valor, montoOperacion));
    case "2x1":
    case "regalo":
      // Sigue siendo "no calculable" y NO 0: un 0 mentiría en el reporte al
      // comercio (§11.7.12). Un tope no lo vuelve calculable.
      return null;
  }
}
