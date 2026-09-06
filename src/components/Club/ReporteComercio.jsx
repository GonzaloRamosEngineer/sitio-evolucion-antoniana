// src/components/Club/ReporteComercio.jsx
//
// LA FASE 3 DE §12.8 — «esto es lo que hace que el comercio renueve».
//
// §12.6 lo dice sin vueltas: el premio que más vale no es el badge de nivel,
// es el reporte con sus propios números. «El club te mandó 47 personas este
// trimestre, $1,2M de consumo, el 60% volvió una segunda vez» es lo que el
// dueño le muestra a su contador para justificar seguir un año más, y no lo
// tiene ningún club chico.
//
// TRES DECISIONES DE PRESENTACIÓN QUE NO SON ESTÉTICAS:
//
//   1) El consumo declarado se muestra CON su cobertura («sobre 12 de 47
//      canjes»). Un total que sale de la mitad de los datos y se muestra como
//      si fuera el total es peor que no mostrarlo: §12.9.2 dejó el monto
//      opcional a propósito, así que la cobertura parcial es la norma, no una
//      anomalía. Y mostrarla es lo que empuja al comercio a cargar el monto,
//      que era todo el mecanismo previsto.
//
//   2) Los canjes sin confirmar se muestran arriba y no escondidos. §12.3 dice
//      que no son un error sino la métrica de adopción del local. Un panel que
//      solo muestra lo confirmado le oculta al comercio justo el número que le
//      conviene mirar.
//
//   3) No hay librería de gráficos. La serie mensual son doce divs con un
//      ancho porcentual. Una dependencia nueva para dibujar doce barras no se
//      paga sola, y §12.7 regla 6 pide que la UI del club no arrastre nada.
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Loader2, TrendingUp, Users, Wallet } from 'lucide-react';

import { getReporteComercio, getReportePorBeneficio, getReportePorMes } from '@/api/clubApi';

const plata = (n) => `$${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2026-09-01` -> `sep 26`. Se parsea a mano: `new Date('2026-09-01')` es UTC
 *  y en Argentina devuelve el mes anterior a la noche. */
const etiquetaMes = (iso) => {
  const [a, m] = String(iso).split('-');
  return `${MES_CORTO[Number(m) - 1] ?? '?'} ${a?.slice(2) ?? ''}`;
};

const RANGOS = [
  { clave: 'trimestre', etiqueta: 'Último trimestre', meses: 3 },
  { clave: 'anio', etiqueta: 'Últimos 12 meses', meses: 12 },
  { clave: 'todo', etiqueta: 'Desde el inicio', meses: null },
];

/** El primer día del mes de hace N meses, en formato `YYYY-MM-DD`. */
const desdeHace = (meses) => {
  if (meses == null) return null;
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (meses - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const Tarjeta = ({ icono: Icono, valor, titulo, detalle }) => (
  <div className="rounded-sm border border-brand-dark/10 bg-white p-4">
    <div className="flex items-center gap-2 text-brand-dark/60">
      <Icono aria-hidden="true" className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase tracking-[0.14em]">{titulo}</span>
    </div>
    <p className="mt-2 text-2xl font-display font-bold text-brand-dark">{valor}</p>
    {detalle && <p className="mt-1 text-xs text-brand-dark/60">{detalle}</p>}
  </div>
);

const ReporteComercio = ({ comercioId }) => {
  const [rango, setRango] = useState('anio');
  const [cargando, setCargando] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [porBeneficio, setPorBeneficio] = useState([]);
  const [porMes, setPorMes] = useState([]);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!comercioId) return;
    setCargando(true);
    setError(null);

    const meses = RANGOS.find((r) => r.clave === rango)?.meses ?? null;
    const desde = desdeHace(meses);

    // Las tres en paralelo: son tres RPC independientes y encadenarlas
    // triplicaría la espera de una pantalla que ya es secundaria.
    const [r1, r2, r3] = await Promise.all([
      getReporteComercio(comercioId, { desde }),
      getReportePorBeneficio(comercioId, { desde }),
      getReportePorMes(comercioId, 12),
    ]);
    setCargando(false);

    // La función lanza `insufficient_privilege` si el comercio no es tuyo, y
    // eso llega acá como `error`. Se muestra en vez de dibujar ceros: un panel
    // en cero y un panel sin permiso se ven idénticos, y son cosas distintas.
    if (r1.error) {
      setError('No pudimos traer tus números. Probá de nuevo en un rato.');
      return;
    }
    setResumen(r1.data?.[0] ?? null);
    setPorBeneficio(r2.data ?? []);
    setPorMes(r3.data ?? []);
  }, [comercioId, rango]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando && !resumen) {
    return (
      <div className="py-16 text-center">
        <Loader2 aria-hidden="true" className="mx-auto h-6 w-6 animate-spin text-brand-dark/40" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-sm border border-red-600/30 bg-red-50 p-4 text-sm text-red-800">{error}</p>
    );
  }

  const confirmados = resumen?.canjes_confirmados ?? 0;
  const personas = resumen?.personas ?? 0;
  const recurrentes = resumen?.personas_recurrentes ?? 0;
  const conMonto = resumen?.canjes_con_monto ?? 0;
  const sinConfirmar = (resumen?.canjes_pendientes ?? 0) + (resumen?.canjes_expirados ?? 0);
  const topeMes = Math.max(1, ...porMes.map((m) => m.confirmados ?? 0));

  return (
    <div className="space-y-8">
      {/* ---- Rango ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange aria-hidden="true" className="h-4 w-4 text-brand-dark/50" />
        {RANGOS.map((r) => (
          <button
            key={r.clave}
            type="button"
            onClick={() => setRango(r.clave)}
            className={`rounded-sm border px-3 py-1 text-xs font-semibold transition ${
              rango === r.clave
                ? 'border-brand-dark bg-brand-dark text-white'
                : 'border-brand-dark/20 text-brand-dark/70 hover:border-brand-dark/40'
            }`}
          >
            {r.etiqueta}
          </button>
        ))}
      </div>

      {confirmados === 0 ? (
        <p className="rounded-sm border border-brand-dark/10 bg-brand-light/40 p-4 text-sm text-brand-dark/70">
          Todavía no hay canjes confirmados en este período.
          {sinConfirmar > 0 && (
            <>
              {' '}
              Sí hubo <strong>{sinConfirmar}</strong> código
              {sinConfirmar === 1 ? '' : 's'} que alguien generó y nadie confirmó en el
              mostrador: es la señal de que el sistema todavía no entró en la rutina del local.
            </>
          )}
        </p>
      ) : (
        <>
          {/* ---- Los cuatro números ---- */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta
              icono={Users}
              titulo="Personas"
              valor={personas}
              detalle={
                recurrentes > 0
                  ? `${recurrentes} volvió más de una vez`
                  : 'todavía ninguna volvió una segunda vez'
              }
            />
            <Tarjeta
              icono={TrendingUp}
              titulo="Canjes"
              valor={confirmados}
              detalle={
                sinConfirmar > 0
                  ? `${sinConfirmar} generado${sinConfirmar === 1 ? '' : 's'} y sin confirmar`
                  : 'todos los generados se confirmaron'
              }
            />
            <Tarjeta
              icono={Wallet}
              titulo="Ahorro que diste"
              valor={plata(resumen?.ahorro_total)}
              detalle="lo que tus clientes se llevaron de descuento"
            />
            <Tarjeta
              icono={Wallet}
              titulo="Consumo declarado"
              valor={plata(resumen?.consumo_declarado)}
              // La cobertura es parte del número, no una nota al pie: sin ella
              // un total parcial se lee como total.
              detalle={
                conMonto === 0
                  ? 'sin datos: cargá el monto al confirmar'
                  : `sobre ${conMonto} de ${confirmados} canje${confirmados === 1 ? '' : 's'}`
              }
            />
          </div>

          {conMonto < confirmados && (
            <p className="text-xs text-brand-dark/60">
              El consumo sale del monto que se carga al confirmar, y es opcional. Cuantas más
              veces lo cargues, más se parece este número a lo que el club realmente te movió.
            </p>
          )}
        </>
      )}

      {/* ---- Por beneficio ---- */}
      {porBeneficio.length > 0 && (
        <section>
          <h3 className="border-b border-brand-dark/10 pb-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark/70">
            Por beneficio
          </h3>
          <ul className="divide-y divide-brand-dark/10">
            {porBeneficio.map((b) => (
              <li key={b.beneficio_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-dark">{b.titulo}</p>
                  <p className="text-xs text-brand-dark/60">
                    {b.confirmados === 0
                      ? 'nadie lo usó en este período'
                      : `${b.personas} persona${b.personas === 1 ? '' : 's'} · ${plata(b.ahorro_total)} de ahorro`}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-display font-bold text-brand-dark">
                  {b.confirmados}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- La serie ---- */}
      {porMes.length > 0 && (
        <section>
          <h3 className="border-b border-brand-dark/10 pb-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark/70">
            Mes a mes
          </h3>
          <ul className="mt-3 space-y-1">
            {porMes.map((m) => (
              <li key={m.mes} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-brand-dark/60">{etiquetaMes(m.mes)}</span>
                <div className="h-4 flex-1 rounded-sm bg-brand-dark/5">
                  <div
                    className="h-4 rounded-sm bg-brand-dark/70"
                    style={{ width: `${((m.confirmados ?? 0) / topeMes) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold text-brand-dark">
                  {m.confirmados}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default ReporteComercio;
