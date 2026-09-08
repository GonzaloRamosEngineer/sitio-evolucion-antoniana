import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Lock, AlertTriangle, ArrowRight, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useAuth } from '@/hooks/useAuth';
import { useMiAcceso, useMiAntiguedad, useMiMembresia } from '@/hooks/useContentQueries';
import ReclamarAportes from '@/components/Acceso/ReclamarAportes';
import {
  SIN_ACCESO, estadoAcceso, diasHasta, formatearMeses, nombreOrigen, formatearFecha,
} from '@/lib/acceso';
import {
  SIN_MEMBRESIA, estadoMembresia, etiquetaEstado, fraseEstado, etiquetaNumero,
} from '@/lib/miembro';

/**
 * Presentación de cada estado. Vive en un objeto y no en cadenas de ternarios
 * dentro del JSX para que agregar un estado nuevo sea una entrada más y no una
 * rama suelta en cuatro lugares distintos.
 */
const ESTADOS = {
  vigente: {
    icono: ShieldCheck,
    titulo: 'Tu acceso está vigente',
    tono: 'border-brand-primary/30 bg-white',
    acento: 'text-brand-primary',
  },
  gracia: {
    icono: Clock,
    titulo: 'Tu acceso está en tolerancia',
    tono: 'border-brand-gold/50 bg-brand-gold/10',
    acento: 'text-brand-dark',
  },
  vencido: {
    icono: AlertTriangle,
    titulo: 'Tu acceso está vencido',
    tono: 'border-red-200 bg-red-50/60',
    acento: 'text-red-700',
  },
  sin_aportes: {
    icono: Lock,
    titulo: 'Todavía no tenés acceso',
    tono: 'border-brand-dark/15 bg-white',
    acento: 'text-brand-dark',
  },
};

const Dato = ({ etiqueta, valor }) => (
  <div className="min-w-0 rounded-xl bg-brand-sand p-3 sm:p-4">
    <dt className="text-sm text-gray-600 mb-1">{etiqueta}</dt>
    <dd className="text-brand-dark font-semibold text-sm sm:text-base break-words">{valor}</dd>
  </div>
);

const CarnetPage = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const accesoQuery = useMiAcceso(userId);
  const antiguedadQuery = useMiAntiguedad(userId);
  const { data: acceso = SIN_ACCESO, isPending: cargandoAcceso } = accesoQuery;
  const { data: antiguedad } = antiguedadQuery;
  // La condición institucional (§10.1.a). Es OTRA pregunta que el acceso, y por
  // eso son dos consultas: alguien puede estar al día y suspendido, o en regla
  // y con la cuota vencida. Las dos antigüedades salen de la misma función SQL
  // (`antiguedad_socio`), así que esto NO es una segunda fuente de verdad.
  const membresiaQuery = useMiMembresia(userId);
  const { data: membresia = SIN_MEMBRESIA } = membresiaQuery;

  // Reloj en vivo para la presentación del carnet. No reemplaza la consulta
  // de acceso ni representa la fecha de la última verificación del servidor.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Ojo con el spinner: la query queda en `isPending` mientras está deshabilitada.
  const cargando = Boolean(userId) && (cargandoAcceso || membresiaQuery.isPending);

  const estado = estadoAcceso(acceso);
  const { icono: Icono, titulo, tono, acento } = ESTADOS[estado];
  const diasRestantes = diasHasta(acceso?.vence_el);

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      <Helmet>
        <title>Mi carnet - Fundación Evolución Antoniana</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <section className="bg-brand-primary text-white border-t-2 border-brand-gold">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="mb-5">
            <Eyebrow light>Comunidad</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-3xl sm:text-4xl tracking-tight text-balance">
            Mi carnet
          </h1>
          <p className="mt-4 max-w-[34rem] text-white/75 leading-relaxed">
            Tu credencial y el estado de tu acceso a beneficios, en un solo lugar.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 min-h-[44px] mb-3 text-sm font-semibold text-brand-primary"><ArrowLeft aria-hidden="true" className="w-4 h-4" />Volver a mi panel</Link>
        {accesoQuery.isError || membresiaQuery.isError ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold text-brand-dark">No pudimos verificar tu carnet</h2>
            <p className="mt-2 text-sm text-gray-600">Volvé a intentar para consultar tu estado actualizado.</p>
            <Button variant="outline" className="mt-4 min-h-[44px]" onClick={() => { accesoQuery.refetch(); membresiaQuery.refetch(); }}>Volver a intentar</Button>
          </div>
        ) : cargando ? (
          <div role="status" className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">Cargando tu carnet…</div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* --- ESTADO --- */}
            <div className={`rounded-2xl border p-5 sm:p-6 ${tono}`}>
              <div className={`flex items-start gap-3 ${acento}`}>
                <Icono className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-poppins font-bold text-xl text-brand-dark leading-tight">
                    {titulo}
                  </h2>

                  {estado === 'vigente' && acceso.vence_el && (
                    <p className="mt-2 text-sm text-gray-600">
                      Vence el {formatearFecha(acceso.vence_el)}
                      {diasRestantes !== null && diasRestantes >= 0 && (
                        <> — te quedan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}</>
                      )}
                      .
                    </p>
                  )}

                  {estado === 'gracia' && (
                    <p className="mt-2 text-sm text-gray-600">
                      Tu último aporte venció el {formatearFecha(acceso.vence_el)}, pero conservás el
                      acceso durante 30 días de tolerancia. Regularizá para no perderlo.
                    </p>
                  )}

                  {estado === 'vencido' && (
                    <p className="mt-2 text-sm text-gray-600">
                      Tu último aporte cubrió hasta el {formatearFecha(acceso.vence_el)}. Podés
                      retomar cuando quieras: tu antigüedad no se borra.
                    </p>
                  )}

                  {estado === 'sin_aportes' && (
                    <p className="mt-2 text-sm text-gray-600">
                      El acceso a los beneficios se obtiene con la cuota social o con una
                      donación desde el valor de una cuota.
                    </p>
                  )}
                </div>
              </div>

              {estado !== 'vigente' && (
                <div className="mt-4">
                  <Button variant="action" asChild className="w-full sm:w-auto min-h-[48px]">
                    <Link to="/collaborate">
                      {estado === 'sin_aportes' ? 'Quiero ser parte' : 'Regularizar mi aporte'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* --- CONDICIÓN INSTITUCIONAL, cuando NO es la normal ---
                Solo aparece si hay algo que explicar. Un cartel permanente que
                diga "sos padrino activo" al lado de otro que ya dice "acceso
                vigente" es ruido; uno que diga "estás suspendido" cuando el
                acceso figura vigente es la única forma de que la persona
                entienda por qué le rebotan las cosas. */}
            {['suspendido', 'pendiente', 'baja'].includes(estadoMembresia(membresia)) && (
              <div className="mt-5 rounded-2xl border border-brand-dark/15 bg-white p-5 sm:p-6">
                <h2 className="font-poppins font-bold text-lg text-brand-dark leading-tight">
                  {etiquetaEstado(membresia)}
                </h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{fraseEstado(membresia)}</p>
                <Link to="/contact" className="inline-flex items-center min-h-[44px] mt-2 text-sm font-semibold text-brand-primary underline underline-offset-4">Consultar mi condición</Link>
              </div>
            )}

            {/* --- APORTES SIN VINCULAR (§10.18) ---
                Va acá, entre el estado y la credencial, y no al pie: el caso
                que resuelve es justamente el de quien lee "todavía no tenés
                acceso" teniendo un aporte hecho sin sesión. Abajo de todo no
                lo vería. */}
            <ReclamarAportes userId={userId} />

            {/* --- CREDENCIAL --- */}
            <div className="mt-5 rounded-2xl border border-brand-dark/10 bg-white overflow-hidden">
              <div className="bg-brand-dark p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-brand-gold"><CreditCard aria-hidden="true" className="h-5 w-5" /><span className="text-xs font-semibold tracking-wide">Credencial digital</span></div>
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-white/75">
                    Fundación Evolución Antoniana
                  </span>
                  <span className="block text-white font-poppins font-bold text-2xl sm:text-3xl mt-2 break-words">
                    {user?.name || user?.email}
                  </span>
                </div>
                {/* Dos etiquetas y no una, porque son dos cosas distintas
                    (§10.2): arriba la CONDICIÓN institucional —que sale del
                    vocabulario de la entidad, no de la palabra "socio" escrita
                    a mano— y abajo el ACCESO a beneficios, que depende del
                    aporte. Un padrino suspendido con la cuota al día tiene que
                    poder ver las dos cosas a la vez. */}
                <div className="flex flex-wrap gap-2">
                  {etiquetaEstado(membresia) && (
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                        estadoMembresia(membresia) === 'activo'
                          ? 'bg-white/15 text-brand-gold'
                          : 'bg-white/10 text-white/90'
                      }`}
                    >
                      {etiquetaEstado(membresia)}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      acceso.tiene_acceso
                        ? 'bg-brand-gold text-brand-dark'
                        : 'bg-white/15 text-white/90'
                    }`}
                  >
                    {estado === 'gracia' ? 'En tolerancia' : estado === 'vigente' ? 'Acceso vigente' : estado === 'vencido' ? 'Acceso vencido' : 'Sin acceso'}
                  </span>
                </div>
              </div>

              <dl className="p-4 sm:p-6 grid grid-cols-2 gap-3">
                {acceso.vence_el && <Dato etiqueta="Aporte vigente hasta" valor={formatearFecha(acceso.vence_el)} />}
                {membresia?.numero != null && (
                  <Dato etiqueta={etiquetaNumero()} valor={`N° ${membresia.numero}`} />
                )}
                {membresia?.categoria && <Dato etiqueta="Categoría" valor={membresia.categoria} />}
                {user?.dni && <Dato etiqueta="Documento" valor={user.dni} />}
              </dl>
              {/* Reloj de referencia visual; el estado de acceso proviene de la consulta. */}
              <div className="px-5 sm:px-6 py-4 bg-brand-sand border-t border-brand-dark/10 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-600 font-medium">
                  Hora actual
                </span>
                <time dateTime={ahora.toISOString()} className="font-mono text-sm text-brand-dark tabular-nums" aria-live="off">
                  {ahora.toLocaleDateString('es-AR')} {ahora.toLocaleTimeString('es-AR')}
                </time>
              </div>
            </div>

            <details className="mt-5 rounded-2xl border border-gray-200 bg-white">
              <summary className="cursor-pointer p-5 sm:p-6 text-brand-dark font-semibold min-h-[56px]">Mi trayectoria y aportes</summary>
              <dl className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-2 gap-3">
                {antiguedad?.socio_desde && (
                  <Dato etiqueta="Parte de la comunidad desde" valor={formatearFecha(antiguedad.socio_desde)} />
                )}
                {antiguedad && (
                  <Dato
                    etiqueta="Tiempo aportado"
                    valor={formatearMeses(antiguedad.meses_aportados)}
                  />
                )}
                {antiguedad?.racha_meses > 0 && (
                  <Dato
                    etiqueta="Racha actual"
                    valor={formatearMeses(antiguedad.racha_meses)}
                  />
                )}
                {nombreOrigen(acceso.origen) && (
                  <Dato etiqueta="Origen del acceso" valor={nombreOrigen(acceso.origen)} />
                )}
              </dl>
              {antiguedadQuery.isPending && <p role="status" className="px-5 pb-4 text-sm text-gray-600">Cargando tu antigüedad…</p>}
              {antiguedadQuery.isError && <div role="alert" className="px-5 pb-4 text-sm text-gray-600"><p>No pudimos cargar tu antigüedad.</p><button type="button" onClick={() => antiguedadQuery.refetch()} className="min-h-[44px] font-semibold text-brand-primary underline">Reintentar antigüedad</button></div>}

            </details>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-brand-dark">Cómo usar tu carnet</h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">Consultá las condiciones del beneficio y mostrale esta pantalla al comercio adherido. El estado de acceso figura en tu credencial.</p>
              <Button asChild className="mt-4 min-h-[48px] w-full sm:w-auto rounded-xl"><Link to="/beneficios">Ver beneficios<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CarnetPage;
