import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Lock, AlertTriangle, ArrowRight, ArrowLeft, CreditCard, Heart, ChevronDown, CalendarDays, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useAuth } from '@/hooks/useAuth';
import { useMiAcceso, useMiAntiguedad, useMiMembresia, useMiResumenAportes } from '@/hooks/useContentQueries';
import ReclamarAportes from '@/components/Acceso/ReclamarAportes';
import {
  SIN_ACCESO, SIN_RESUMEN, estadoAcceso, diasHasta, formatearMeses, fuenteDelAcceso, formatearFecha,
  formatearCuotas, formatearPesos,
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
  // Regla 2026-10: quien solo donó queda registrado como donante, pero el
  // acceso a beneficios sale de la cuota. No es "sin aportes".
  donante: {
    icono: Heart,
    titulo: 'Sos donante de la Fundación',
    tono: 'border-brand-gold/50 bg-white',
    acento: 'text-brand-dark',
  },
  sin_aportes: {
    icono: Lock,
    titulo: 'Todavía no tenés acceso',
    tono: 'border-brand-dark/15 bg-white',
    acento: 'text-brand-dark',
  },
};

const CarnetPage = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const accesoQuery = useMiAcceso(userId);
  const antiguedadQuery = useMiAntiguedad(userId);
  const { data: acceso = SIN_ACCESO, isPending: cargandoAcceso } = accesoQuery;
  const { data: antiguedad } = antiguedadQuery;
  const { data: resumen = SIN_RESUMEN } = useMiResumenAportes(userId);
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

  const estado = estadoAcceso(acceso, resumen);
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

                  {estado === 'donante' && (
                    <p className="mt-2 text-sm text-gray-600">
                      Gracias: tus donaciones suman {formatearPesos(resumen.total_aportado)} a tu
                      total aportado. El acceso a los beneficios se obtiene con la cuota mensual.
                    </p>
                  )}

                  {estado === 'sin_aportes' && (
                    <p className="mt-2 text-sm text-gray-600">
                      El acceso a los beneficios se obtiene con la cuota mensual. Una donación
                      suma a tu total aportado, pero no da acceso por sí sola.
                    </p>
                  )}
                </div>
              </div>

              {estado !== 'vigente' && (
                <div className="mt-4">
                  <Button variant="action" asChild className="w-full sm:w-auto min-h-[48px]">
                    <Link to="/collaborate">
                      {estado === 'sin_aportes' ? 'Quiero ser parte'
                        : estado === 'donante' ? 'Sumarme con la cuota mensual'
                        : 'Regularizar mi aporte'}
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
            <div className="mt-5 rounded-[1.75rem] border border-brand-dark/10 bg-white p-2 shadow-[0_18px_40px_-24px_rgba(14,42,72,0.65)]">
              <div className="relative isolate overflow-hidden rounded-[1.35rem] bg-[linear-gradient(125deg,#102b4b_0%,#1d4779_58%,#102b4b_100%)] text-white">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full border-[32px] border-white/[0.06]" />
                <div aria-hidden="true" className="pointer-events-none absolute -left-16 bottom-0 -z-10 h-40 w-40 rounded-full bg-brand-gold/10 blur-2xl" />
                <div className="relative p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                        <img src="/img/logotransparente.webp" alt="" className="h-full w-full object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-brand-gold">Credencial digital</span>
                        <span className="mt-0.5 block text-xs leading-snug text-white/80">Fundación Evolución Antoniana</span>
                      </span>
                    </div>
                    <CreditCard aria-hidden="true" className="h-5 w-5 shrink-0 text-white/50" />
                  </div>

                  <div className="mt-9 sm:mt-12">
                    <p className="text-xs font-medium uppercase tracking-widest text-white/70">Titular</p>
                    <p className="mt-1 break-words font-poppins text-2xl font-bold leading-tight sm:text-3xl">
                      {user?.name || user?.email}
                    </p>
                  </div>

                  {/* La condición institucional y el acceso a beneficios son datos independientes. */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {etiquetaEstado(membresia) && (
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${estadoMembresia(membresia) === 'activo' ? 'border-brand-gold/50 bg-brand-gold/15 text-brand-gold' : 'border-white/25 bg-white/10 text-white'}`}>
                        {etiquetaEstado(membresia)}
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${acceso.tiene_acceso ? 'bg-brand-gold text-brand-dark' : 'bg-white/15 text-white'}`}>
                      {estado === 'gracia' ? 'En tolerancia' : estado === 'vigente' ? 'Acceso vigente' : estado === 'vencido' ? 'Acceso vencido' : 'Sin acceso'}
                    </span>
                  </div>

                  {(membresia?.numero != null || acceso.vence_el) && (
                    <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                      {membresia?.numero != null && (
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-white/70">{etiquetaNumero()}</dt>
                          <dd className="mt-1 font-poppins text-base font-semibold tabular-nums">N° {membresia.numero}</dd>
                        </div>
                      )}
                      {acceso.vence_el && (
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-white/70">Aporte cubierto hasta</dt>
                          <dd className="mt-1 text-sm font-semibold leading-snug">{formatearFecha(acceso.vence_el)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              </div>

              {(membresia?.categoria || user?.dni) && (
                <dl className="grid grid-cols-2 gap-4 px-4 py-4 sm:px-6">
                  {membresia?.categoria && (
                    <div className="min-w-0"><dt className="text-xs text-gray-500">Categoría</dt><dd className="mt-1 break-words text-sm font-semibold text-brand-dark">{membresia.categoria}</dd></div>
                  )}
                  {user?.dni && (
                    <div className="min-w-0"><dt className="text-xs text-gray-500">Documento</dt><dd className="mt-1 break-words text-sm font-semibold tabular-nums text-brand-dark">{user.dni}</dd></div>
                  )}
                </dl>
              )}
              {/* Reloj de referencia visual; el estado de acceso proviene de la consulta. */}
              <div className="mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-brand-dark/10 px-0 py-3 sm:mx-6">
                <span className="text-sm text-gray-600 font-medium">
                  Hora local
                </span>
                <time dateTime={ahora.toISOString()} className="font-mono text-sm text-brand-dark tabular-nums text-right" aria-live="off">
                  <span className="whitespace-nowrap">{ahora.toLocaleDateString('es-AR')}</span>{' '}
                  <span className="whitespace-nowrap">{ahora.toLocaleTimeString('es-AR')}</span>
                </time>
              </div>
            </div>

            <details className="group mt-5 overflow-hidden rounded-[1.5rem] border border-brand-dark/10 bg-white shadow-[0_12px_32px_-26px_rgba(14,42,72,0.5)]">
              <summary className="cursor-pointer list-none p-5 sm:p-6 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-primary">
                <span className="flex items-center gap-3 text-brand-dark">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-dark"><Sparkles aria-hidden="true" className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1 font-poppins text-lg font-bold">Tu recorrido</span>
                  <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-primary transition-transform group-open:rotate-180" />
                </span>
                <span className="mt-1 block pl-[52px] text-sm text-gray-600">
                  {antiguedadQuery.isError ? 'No pudimos cargar tus cuotas y tu racha.' : 'Cada aporte cuenta en esta historia.'}
                </span>
                <span className="mt-5 grid grid-cols-2 gap-3">
                  {/* `meses_aportados` son cuotas efectivamente pagadas; una donación no suma cuotas. */}
                  <span className="min-w-0 rounded-2xl bg-brand-primary px-4 py-4 text-white">
                    <span className="block text-xs font-medium text-white/75">Cuotas pagadas</span>
                    <strong className="mt-2 block font-poppins text-xl leading-tight tabular-nums break-words">
                      {antiguedadQuery.isPending || antiguedadQuery.isError ? '—' : formatearCuotas(antiguedad?.meses_aportados || 0)}
                    </strong>
                  </span>
                  <span className="min-w-0 rounded-2xl bg-brand-gold/15 px-4 py-4 text-brand-dark">
                    <span className="flex items-center gap-1.5 text-xs font-medium"><Flame aria-hidden="true" className="h-4 w-4" />Racha actual</span>
                    <strong className="mt-2 block font-poppins text-xl leading-tight tabular-nums break-words">
                      {antiguedadQuery.isPending || antiguedadQuery.isError ? '—' : antiguedad?.racha_meses > 0 ? formatearMeses(antiguedad.racha_meses) : 'Sin racha'}
                    </strong>
                  </span>
                </span>
                {Number(resumen.total_aportado) > 0 && (
                  <span className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm text-brand-dark">
                    <span className="text-gray-600">Total aportado</span>
                    <strong className="font-poppins text-lg tabular-nums">{formatearPesos(resumen.total_aportado)}</strong>
                  </span>
                )}
                <span className="mt-3 block text-center text-xs font-semibold text-brand-primary group-open:hidden">Ver más de mi recorrido</span>
              </summary>
              <div className="mx-5 border-t border-brand-dark/10 pb-5 pt-4 sm:mx-6 sm:pb-6">
                <dl className="space-y-3">
                  {antiguedad?.socio_desde && (
                    <div className="flex items-start gap-3">
                      <CalendarDays aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
                      <div><dt className="text-xs text-gray-500">Parte de la comunidad desde</dt><dd className="text-sm font-semibold text-brand-dark">{formatearFecha(antiguedad.socio_desde)}</dd></div>
                    </div>
                  )}
                  {fuenteDelAcceso(acceso) && (
                    <div className="flex items-start gap-3">
                      <Heart aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
                      <div><dt className="text-xs text-gray-500">Tu acceso viene de</dt><dd className="text-sm font-semibold text-brand-dark">{fuenteDelAcceso(acceso)}</dd></div>
                    </div>
                  )}
                </dl>
              </div>
              {antiguedadQuery.isPending && <p role="status" className="px-5 pb-4 text-sm text-gray-600">Cargando tu antigüedad…</p>}
              {antiguedadQuery.isError && <div role="alert" className="px-5 pb-4 text-sm text-gray-600"><p>No pudimos cargar tu antigüedad.</p><button type="button" onClick={() => antiguedadQuery.refetch()} className="min-h-[44px] font-semibold text-brand-primary underline">Reintentar antigüedad</button></div>}

            </details>

            <div className="mt-5 rounded-[1.5rem] border border-brand-dark/10 bg-white p-5 sm:p-6">
              <h2 className="font-poppins text-lg font-bold text-brand-dark">Usá tu carnet en el club</h2>
              <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-medium text-brand-dark">
                {['Explorá', 'Elegí', 'Generá tu código'].map((paso, index) => (
                  <li key={paso} className="min-w-0">
                    <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 font-poppins text-sm font-bold text-brand-primary">{index + 1}</span>
                    <span className="block leading-tight">{paso}</span>
                  </li>
                ))}
              </ol>
              <Button asChild className="mt-5 min-h-[48px] w-full rounded-xl"><Link to="/club">Canjear un beneficio<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CarnetPage;
