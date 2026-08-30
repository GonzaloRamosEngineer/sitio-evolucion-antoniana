import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useAuth } from '@/hooks/useAuth';
import { useMiAcceso, useMiAntiguedad } from '@/hooks/useContentQueries';
import ReclamarAportes from '@/components/Acceso/ReclamarAportes';
import { SIN_ACCESO, estadoAcceso, diasHasta, formatearMeses, nombreOrigen } from '@/lib/acceso';

const fmtFecha = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-AR', { dateStyle: 'long' }) : null;

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
    titulo: 'Tu aporte venció, estás en período de tolerancia',
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
  <div className="py-4 border-b border-brand-dark/10 last:border-0">
    <span className="block text-xs font-bold uppercase tracking-widest text-brand-dark/45 mb-1">
      {etiqueta}
    </span>
    <span className="text-brand-dark font-medium">{valor}</span>
  </div>
);

const CarnetPage = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: acceso = SIN_ACCESO, isPending: cargandoAcceso } = useMiAcceso(userId);
  const { data: antiguedad } = useMiAntiguedad(userId);

  // Reloj en vivo. No es decoración: en la fase 1 el comercio MIRA el carnet en
  // vez de escanearlo (ROADMAP §12.8), así que lo único que distingue la
  // pantalla real de una captura de pantalla vieja es que la hora avance.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Ojo con el spinner: la query queda en `isPending` mientras está deshabilitada.
  const cargando = Boolean(userId) && cargandoAcceso;

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="mb-5">
            <Eyebrow light>Comunidad</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-3xl sm:text-4xl tracking-tight text-balance">
            Mi carnet
          </h1>
          <p className="mt-4 max-w-[34rem] text-white/75 leading-relaxed">
            Mostralo en los comercios adheridos para usar tus beneficios.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {cargando ? (
          <div className="h-64 rounded-sm border border-brand-dark/10 bg-white animate-pulse" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* --- ESTADO --- */}
            <div className={`rounded-sm border p-6 sm:p-8 ${tono}`}>
              <div className={`flex items-start gap-3 ${acento}`}>
                <Icono className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-poppins font-bold text-xl text-brand-dark leading-tight">
                    {titulo}
                  </h2>

                  {estado === 'vigente' && acceso.vence_el && (
                    <p className="mt-2 text-brand-dark/70">
                      Vence el {fmtFecha(acceso.vence_el)}
                      {diasRestantes !== null && diasRestantes >= 0 && (
                        <> — te quedan {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}</>
                      )}
                      .
                    </p>
                  )}

                  {estado === 'gracia' && (
                    <p className="mt-2 text-brand-dark/70">
                      Tu último aporte venció el {fmtFecha(acceso.vence_el)}, pero conservás el
                      acceso durante 30 días de tolerancia. Regularizá para no perderlo.
                    </p>
                  )}

                  {estado === 'vencido' && (
                    <p className="mt-2 text-brand-dark/70">
                      Tu último aporte cubrió hasta el {fmtFecha(acceso.vence_el)}. Podés
                      retomar cuando quieras: tu antigüedad no se borra.
                    </p>
                  )}

                  {estado === 'sin_aportes' && (
                    <p className="mt-2 text-brand-dark/70">
                      El acceso a los beneficios se obtiene con la cuota social o con una
                      donación desde el valor de una cuota.
                    </p>
                  )}
                </div>
              </div>

              {estado !== 'vigente' && (
                <div className="mt-6 pl-9">
                  <Link to="/collaborate">
                    <Button variant="action">
                      {estado === 'sin_aportes' ? 'Quiero ser parte' : 'Regularizar mi aporte'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* --- APORTES SIN VINCULAR (§10.18) ---
                Va acá, entre el estado y la credencial, y no al pie: el caso
                que resuelve es justamente el de quien lee "todavía no tenés
                acceso" teniendo un aporte hecho sin sesión. Abajo de todo no
                lo vería. */}
            <ReclamarAportes userId={userId} />

            {/* --- CREDENCIAL --- */}
            <div className="mt-8 rounded-sm border border-brand-dark/10 bg-white overflow-hidden">
              <div className="bg-brand-dark px-6 sm:px-8 py-5 flex items-center justify-between gap-4">
                <div>
                  <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-gold">
                    Fundación Evolución Antoniana
                  </span>
                  <span className="block text-white font-poppins font-bold text-lg mt-0.5">
                    {user?.name || user?.email}
                  </span>
                </div>
                <span
                  className={`text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex-shrink-0 ${
                    acceso.tiene_acceso
                      ? 'bg-brand-gold text-brand-dark'
                      : 'bg-white/15 text-white/60'
                  }`}
                >
                  {acceso.tiene_acceso ? 'Vigente' : 'Sin acceso'}
                </span>
              </div>

              <div className="px-6 sm:px-8 py-2">
                {user?.dni && <Dato etiqueta="Documento" valor={user.dni} />}
                {antiguedad?.socio_desde && (
                  <Dato etiqueta="Parte de la comunidad desde" valor={fmtFecha(antiguedad.socio_desde)} />
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
              </div>

              {/* Sello de vigencia: la hora corriendo es lo que hace que una
                  captura de pantalla no sirva para hacerse pasar por socio. */}
              <div className="px-6 sm:px-8 py-4 bg-brand-sand border-t border-brand-dark/10 flex items-center justify-between gap-4">
                <span className="text-xs text-brand-dark/50 uppercase tracking-widest font-bold">
                  Válido al
                </span>
                <span className="font-mono text-sm text-brand-dark tabular-nums">
                  {ahora.toLocaleDateString('es-AR')} {ahora.toLocaleTimeString('es-AR')}
                </span>
              </div>
            </div>

            <p className="mt-6 text-sm text-brand-dark/55 leading-relaxed">
              ¿Buscás qué usar?{' '}
              <Link
                to="/beneficios"
                className="font-bold text-brand-primary underline underline-offset-4"
              >
                Mirá el club de beneficios
              </Link>
              .
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CarnetPage;
