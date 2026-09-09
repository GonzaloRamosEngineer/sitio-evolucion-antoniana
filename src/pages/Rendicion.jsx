// src/pages/Rendicion.jsx
//
// La rendición pública (ROADMAP §10.9, fase 2). Es el sentido de todo el modelo
// de aportes: hasta acá el sitio podía decir cuánto entró; esta página dice **en
// qué se usó**, con el respaldo de un libro y no de un párrafo escrito a mano.
//
// Qué se muestra y qué no, y por qué:
//
//  - **Solo gastos publicados de destinos activos.** No es un filtro de esta
//    página: es lo único que las RLS le entregan a quien no es de la comisión.
//    Si mañana alguien consulta la API a mano, ve exactamente esto.
//  - **El comprobante no se muestra**, ni siquiera de un gasto publicado: una
//    factura trae CUIT, domicilio y a veces la firma de un tercero. Lo que sí se
//    muestra es si existe, para que la ausencia sea visible.
//  - **Los gastos sin comprobante NO se esconden.** Se marcan. Mostrar el hueco
//    es más honesto que ocultar la fila, y es lo que hace creíble al resto.
import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ScrollText, FileCheck2, FileX2, Info } from 'lucide-react';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Button } from '@/components/ui/button';
import { useDestinosActivos, useGastos } from '@/hooks/useContentQueries';
import { balanceDestino } from '@/api/gastosApi';
import { entidad, tituloPagina } from '@/config/entidad';
import { pesos } from '@/lib/utils';


/**
 * Agrupa los gastos por categoría, ordenando por monto descendente.
 *
 * Los sin categoría van juntos al final bajo "Otros gastos" y NO se esconden: un
 * gasto sin clasificar sigue siendo plata que salió, y omitirlo haría que el
 * total del grupo no sume el total del destino — que es la única forma de que
 * esta pantalla pierda sentido.
 *
 * Orden por monto y no alfabético: quien entra a una rendición quiere ver
 * primero dónde se fue la plata, no la primera letra del abecedario.
 */
const agruparPorCategoria = (gastos) => {
  const porCategoria = new Map();
  for (const g of gastos) {
    const clave = g.categoria?.trim() || 'Otros gastos';
    if (!porCategoria.has(clave)) porCategoria.set(clave, { categoria: clave, gastos: [], total: 0 });
    const grupo = porCategoria.get(clave);
    grupo.gastos.push(g);
    grupo.total += Number(g.monto || 0);
  }
  return [...porCategoria.values()].sort((a, b) => {
    // "Otros gastos" siempre último: es el cajón de lo no clasificado y encabezar
    // con él daría la impresión de que nadie miró nada.
    if (a.categoria === 'Otros gastos') return 1;
    if (b.categoria === 'Otros gastos') return -1;
    return b.total - a.total;
  });
};

const soloFecha = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

const Rendicion = () => {
  const destinosQuery = useDestinosActivos();
  const gastosQuery = useGastos();
  const { data: destinos = [], isPending: cargandoDestinos } = destinosQuery;
  const { data: gastos = [] } = gastosQuery;

  // Agrupar acá y no por consulta: son pocas filas y una sola consulta se cachea
  // mejor que N. Si algún día son muchas, esto se vuelve una consulta por destino.
  const gastosPorDestino = useMemo(() => {
    const mapa = new Map();
    for (const g of gastos) {
      if (!mapa.has(g.destino_id)) mapa.set(g.destino_id, []);
      mapa.get(g.destino_id).push(g);
    }
    return mapa;
  }, [gastos]);

  const totales = useMemo(() => {
    const recaudado = destinos.reduce((s, d) => s + Number(d.monto_recaudado || 0), 0);
    const rendido = destinos.reduce((s, d) => s + Number(d.monto_rendido || 0), 0);
    return { recaudado, rendido, saldo: recaudado - rendido };
  }, [destinos]);

  return (
    <>
      <Helmet>
        <title>{tituloPagina('Rendición de cuentas')}</title>
        <meta
          name="description"
          content={`En qué se usó cada aporte recibido por ${entidad.nombre}: lo recaudado, lo gastado y el respaldo de cada gasto.`}
        />
        <link rel="canonical" href={`${entidad.sitio}/rendicion`} />
      </Helmet>

      <div className="min-h-screen bg-brand-sand font-sans">
        <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
          <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16"
          >
            <div className="mb-6"><Eyebrow light>Transparencia</Eyebrow></div>
            <h1 className="font-poppins font-bold text-3xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
              En qué se usó tu aporte
            </h1>
            <p className="max-w-[36rem] text-base sm:text-lg leading-relaxed text-white/75">
              Consultá cuánto se recaudó, en qué se usó y qué respaldo tiene cada gasto publicado.
            </p>
          </motion.div>
        </section>

        <section className="py-8 md:py-12 px-4">
          <div className="mx-auto max-w-5xl space-y-6 md:space-y-8">

            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-brand-dark">Resumen de los destinos activos</h2>
              <p className="text-sm text-gray-600">Todos los montos en pesos argentinos (ARS)</p>
            </div>
            {destinosQuery.isError ? (
              <div role="alert" className="rounded-2xl border border-amber-200 bg-white p-5">
                <p className="font-semibold text-brand-dark">No pudimos cargar la rendición</p>
                <p className="mt-1 text-sm text-gray-600">Volvé a intentar para consultar los importes y sus destinos.</p>
                <Button variant="outline" className="mt-3 min-h-[44px]" onClick={() => destinosQuery.refetch()}>Volver a intentar</Button>
              </div>
            ) : cargandoDestinos ? (
              <div role="status" className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Cargando resumen de aportes…</div>
            ) : (
              <dl className="grid sm:grid-cols-3 gap-3">
                {[
                  ['Recaudado', totales.recaudado, 'Aportes recibidos'],
                  ['Rendido', totales.rendido, 'Gastos con detalle publicado'],
                  ['Saldo por rendir', totales.saldo, 'Recaudado menos rendido'],
                ].map(([label, amount, help]) => <div key={label} className={`min-w-0 rounded-2xl border p-5 ${label === 'Recaudado' ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-gray-200 text-brand-dark'}`}>
                  <dt className="text-sm font-semibold">{label}</dt>
                  <dd className="mt-2 text-2xl sm:text-3xl font-bold font-poppins tabular-nums break-words">{pesos(amount)}</dd>
                  <p className={`mt-2 text-sm ${label === 'Recaudado' ? 'text-white/80' : 'text-gray-600'}`}>{help}</p>
                </div>)}
              </dl>
            )}
            <div className="flex items-start gap-3 rounded-xl border border-brand-primary/10 bg-brand-primary/5 p-4 text-sm text-gray-600">
              <Info aria-hidden="true" className="w-5 h-5 shrink-0 mt-0.5 text-brand-primary" />
              <p><strong className="text-brand-dark">Cómo leer el saldo.</strong> Es la diferencia entre lo recaudado y los gastos publicados. Puede incluir gastos todavía en revisión; no representa necesariamente dinero sin usar.</p>
            </div>
            {!destinosQuery.isError && !cargandoDestinos && destinos.length > 0 && <div className="pt-2">
              <h2 className="text-xl sm:text-2xl font-bold text-brand-dark">En qué se usaron los aportes</h2>
              <p className="mt-1 text-sm text-gray-600">Balance y gastos publicados de cada destino.</p>
            </div>}

            {/* --- Por destino --- */}
            {cargandoDestinos || destinosQuery.isError ? null : destinos.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <ScrollText className="w-10 h-10 text-brand-primary mx-auto mb-3" />
                <p className="font-semibold text-brand-dark">Todavía no hay destinos activos</p>
                <p className="text-sm text-gray-500 mt-1">
                  Cuando se publique un destino activo, vas a poder consultar su balance acá.
                </p>
              </div>
            ) : (
              destinos.map((d) => {
                const balance = balanceDestino(d);
                const suyos = gastosPorDestino.get(d.id) ?? [];

                return (
                  <div key={d.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-gray-100">
                      <h3 className="font-poppins font-bold text-xl sm:text-2xl text-brand-dark break-words">{d.nombre}</h3>
                      {d.descripcion && (d.descripcion.length > 240 ? (
                        <details className="mt-2 text-sm text-gray-600">
                          <summary className="min-h-[44px] py-3 cursor-pointer font-semibold text-brand-primary">Sobre este destino</summary>
                          <p className="leading-relaxed pb-2">{d.descripcion}</p>
                        </details>
                      ) : <p className="mt-2 text-sm text-gray-600 leading-relaxed">{d.descripcion}</p>)}

                      <dl className="mt-5 grid sm:grid-cols-3 gap-3 rounded-xl bg-brand-sand p-4 text-sm tabular-nums">
                        {[
                          ['Recaudado', balance.recaudado],
                          ['Rendido', balance.rendido],
                          ['Saldo por rendir', balance.saldo],
                        ].map(([label, amount]) => <div key={label} className="min-w-0 flex justify-between gap-3 sm:block">
                          <dt className="text-gray-600">{label}</dt>
                          <dd className="font-bold text-brand-dark break-words sm:mt-1">{pesos(amount)}</dd>
                        </div>)}
                      </dl>
                      {Number(d.meta_monto) > 0 && <p className="mt-3 text-sm text-gray-600">Meta de recaudación: <strong className="text-brand-dark">{pesos(d.meta_monto)}</strong></p>}

                      {/* DESDE CUÁNDO RINDE, y no es un adorno.
                          Un destino puede tener movimientos anteriores a la fecha en
                          que la entidad empezó a rendirlo — plata administrada de un
                          tercero, un período que se digitalizó después—. Sin decirlo,
                          quien compare el libro con el extracto completo va a
                          encontrar movimientos que "faltan" y va a concluir lo peor.
                          Decirlo cuesta un renglón. */}
                      {d.fecha_inicio && (
                        <p className="mt-3 text-xs text-gray-500">
                          Esta rendición cubre desde el {soloFecha(d.fecha_inicio)}.
                        </p>
                      )}

                      {balance.porcentajeRendido !== null && (
                        <div className="mt-4">
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                            role="progressbar"
                            aria-valuenow={balance.porcentajeRendido}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Porcentaje rendido de ${d.nombre}`}
                          >
                            <div
                              className="h-full rounded-full bg-brand-primary"
                              style={{ width: `${balance.porcentajeRendido}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-sm text-gray-600">
                            {balance.porcentajeRendido}% de lo recaudado ya tiene rendición publicada
                          </p>
                        </div>
                      )}
                    </div>

                    {gastosQuery.isPending ? <p role="status" className="p-5 sm:p-6 text-sm text-gray-600">Cargando gastos publicados…</p> : gastosQuery.isError ? (
                      <div role="alert" className="p-5 sm:p-6 text-sm text-gray-600"><p>No pudimos cargar el detalle de los gastos.</p><Button variant="outline" className="mt-3 min-h-[44px]" onClick={() => gastosQuery.refetch()}>Reintentar gastos</Button></div>
                    ) : suyos.length === 0 ? (
                      <p className="p-5 sm:p-6 text-sm text-gray-600">Todavía no se publicaron gastos de este destino.</p>
                    ) : (
                      <div>
                        <p className="px-5 sm:px-6 pt-4 text-sm text-gray-600">Gastos publicados por categoría</p>
                        {agruparPorCategoria(suyos).map(grupo => <details key={grupo.categoria} open={grupo.gastos.length === 1} className="border-b border-gray-100 last:border-0">
                          <summary className="cursor-pointer p-5 sm:p-6 text-brand-primary min-h-[56px]">
                            <span className="font-semibold break-words">{grupo.categoria}</span>
                            <span className="flex flex-wrap justify-between gap-2 mt-2 text-sm text-gray-600"><span>{grupo.gastos.length} {grupo.gastos.length === 1 ? 'movimiento' : 'movimientos'}</span><strong className="text-brand-dark tabular-nums">{pesos(grupo.total)}</strong></span>
                          </summary>
                        <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-gray-50/50">
                          {grupo.gastos.map(g => <li key={g.id} className="p-5 sm:p-6">
                            <div className="flex flex-col min-[400px]:flex-row min-[400px]:justify-between gap-2 sm:gap-4">
                              <div className="min-w-0">
                                <p className="text-sm text-gray-600 tabular-nums">{soloFecha(g.fecha)}</p>
                                <p className="mt-1 font-semibold text-brand-dark break-words">{g.concepto}</p>
                                {(g.categoria || g.proveedor) && <p className="mt-1 text-sm text-gray-600 break-words">{[g.categoria, g.proveedor].filter(Boolean).join(' · ')}</p>}
                              </div>
                              <p className="font-bold text-lg text-brand-dark tabular-nums break-words min-[400px]:text-right">{pesos(g.monto)}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 mt-3 text-xs font-semibold ${g.tiene_comprobante ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                              {g.tiene_comprobante ? <FileCheck2 aria-hidden="true" className="w-4 h-4" /> : <FileX2 aria-hidden="true" className="w-4 h-4" />}
                              {g.tiene_comprobante ? 'Con comprobante' : 'Sin comprobante'}
                            </span>
                          </li>)}
                        </ul>
                        </details>)}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
              <h2 className="text-xl font-bold text-brand-dark mb-3">¿Querés consultar un comprobante?</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Los comprobantes de cada gasto quedan archivados y a disposición de quien los
                pida. No se publican porque suelen incluir datos personales de terceros
                —CUIT, domicilio, firma— que no nos corresponde difundir.
              </p>
              <Button variant="link" className="text-brand-primary font-semibold p-0 min-h-[44px] h-auto mt-3 whitespace-normal text-left" asChild>
                <Link to="/contact">Pedir el detalle de un gasto →</Link>
              </Button>
            </div>

            {/* La otra mitad de la transparencia. Las dos páginas se enlazan
                entre sí a propósito: quien viene a ver la plata suele querer
                después el papel que la respalda, y al revés. */}
            <div className="rounded-2xl bg-white border border-gray-100 p-5 sm:p-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Esta página muestra <strong>el movimiento del dinero</strong>. Los
                instrumentos que lo respaldan —estatuto, balances, actas y convenios—
                se publican aparte.
              </p>
              <Button variant="link" className="text-brand-primary font-semibold p-0 min-h-[44px] h-auto mt-3" asChild>
                <Link to="/legal-documents">Ver la documentación oficial →</Link>
              </Button>
            </div>

          </div>
        </section>
      </div>
    </>
  );
};

export default Rendicion;
