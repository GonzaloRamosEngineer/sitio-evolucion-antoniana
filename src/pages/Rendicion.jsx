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

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
const soloFecha = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');

const Rendicion = () => {
  const { data: destinos = [], isPending: cargandoDestinos } = useDestinosActivos();
  const { data: gastos = [] } = useGastos();

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
            className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
          >
            <div className="mb-6"><Eyebrow light>Transparencia</Eyebrow></div>
            <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
              En qué se usó tu aporte
            </h1>
            <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
              Cada peso que entra tiene un destino, y cada gasto que sale de ese destino se
              publica acá con su fecha, su monto y su respaldo.
            </p>
          </motion.div>
        </section>

        <section className="py-16 md:py-20 px-4">
          <div className="container mx-auto max-w-5xl space-y-10">

            {/* --- Totales --- */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <p className="text-xs uppercase tracking-wide text-gray-500">Recaudado</p>
                <p className="text-3xl font-black font-poppins text-brand-dark tabular-nums">
                  {pesos(totales.recaudado)}
                </p>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <p className="text-xs uppercase tracking-wide text-gray-500">Rendido</p>
                <p className="text-3xl font-black font-poppins text-brand-primary tabular-nums">
                  {pesos(totales.rendido)}
                </p>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-white p-6">
                <p className="text-xs uppercase tracking-wide text-gray-500">Disponible</p>
                <p className="text-3xl font-black font-poppins text-brand-dark tabular-nums">
                  {pesos(totales.saldo)}
                </p>
              </div>
            </div>

            {/* La honestidad sobre el propio número: "rendido" no es "gastado".
                Decirlo evita que el saldo se lea como plata parada. */}
            <p className="flex items-start gap-2 rounded-2xl bg-white/60 p-4 text-sm text-gray-600">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-primary" />
              <span>
                <strong className="text-brand-dark">Rendido</strong> es lo que ya está publicado
                con su detalle. Un gasto reciente puede estar todavía en revisión y aparecer más
                adelante, así que <strong className="text-brand-dark">disponible</strong> no es
                necesariamente plata sin usar.
              </span>
            </p>

            {/* --- Por destino --- */}
            {cargandoDestinos ? (
              <p className="text-gray-500">Cargando…</p>
            ) : destinos.length === 0 ? (
              <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center">
                <ScrollText className="w-10 h-10 text-brand-primary mx-auto mb-3" />
                <p className="font-semibold text-brand-dark">Todavía no hay nada que rendir</p>
                <p className="text-sm text-gray-500 mt-1">
                  Cuando haya campañas abiertas, su detalle aparece acá.
                </p>
              </div>
            ) : (
              destinos.map((d) => {
                const balance = balanceDestino(d);
                const suyos = gastosPorDestino.get(d.id) ?? [];

                return (
                  <div key={d.id} className="rounded-3xl border border-gray-100 bg-white overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-gray-100">
                      <h2 className="font-poppins font-bold text-2xl text-brand-dark">{d.nombre}</h2>
                      {d.descripcion && (
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{d.descripcion}</p>
                      )}

                      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm tabular-nums">
                        <span className="text-gray-600">
                          Recaudado <strong className="text-brand-dark">{pesos(balance.recaudado)}</strong>
                          {/* La meta solo si existe: el destino institucional no
                              tiene, y "de $0" se leería como un error. */}
                          {d.meta_monto ? (
                            <span className="text-gray-500"> de {pesos(d.meta_monto)}</span>
                          ) : null}
                        </span>
                        <span className="text-gray-600">
                          Rendido <strong className="text-brand-primary">{pesos(balance.rendido)}</strong>
                        </span>
                        <span className="text-gray-600">
                          Disponible <strong className="text-brand-dark">{pesos(balance.saldo)}</strong>
                        </span>
                      </div>

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
                              className="h-full rounded-full bg-brand-gold"
                              style={{ width: `${balance.porcentajeRendido}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">
                            {balance.porcentajeRendido}% de lo recaudado ya tiene rendición publicada
                          </p>
                        </div>
                      )}
                    </div>

                    {suyos.length === 0 ? (
                      <p className="p-6 md:p-8 text-sm text-gray-500">
                        Todavía no se publicaron gastos de este destino.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {suyos.map((g) => (
                          <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 md:px-8">
                            <span className="text-xs text-gray-500 tabular-nums w-20 shrink-0">
                              {soloFecha(g.fecha)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-brand-dark font-medium truncate">{g.concepto}</p>
                              {(g.categoria || g.proveedor) && (
                                <p className="text-xs text-gray-500 truncate">
                                  {[g.categoria, g.proveedor].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>

                            {/* La ausencia de comprobante se muestra, no se esconde:
                                es lo que hace creíble a los que sí lo tienen. */}
                            {g.tiene_comprobante ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 shrink-0">
                                <FileCheck2 className="w-3.5 h-3.5" /> Con comprobante
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 shrink-0">
                                <FileX2 className="w-3.5 h-3.5" /> Sin comprobante
                              </span>
                            )}

                            <span className="font-bold text-brand-dark tabular-nums shrink-0">
                              {pesos(g.monto)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}

            <div className="rounded-3xl bg-white border border-gray-100 p-6 md:p-8">
              <p className="text-sm text-gray-600 leading-relaxed">
                Los comprobantes de cada gasto quedan archivados y a disposición de quien los
                pida. No se publican porque suelen incluir datos personales de terceros
                —CUIT, domicilio, firma— que no nos corresponde difundir.
              </p>
              <Button variant="link" className="text-brand-action font-bold p-0 h-auto mt-3" asChild>
                <Link to="/contact">Pedir el detalle de un gasto →</Link>
              </Button>
            </div>

          </div>
        </section>
      </div>
    </>
  );
};

export default Rendicion;
