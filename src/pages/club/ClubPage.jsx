// src/pages/club/ClubPage.jsx
//
// El catálogo del club con canje (ROADMAP §12 fase 2).
//
// ⚠️ POR QUÉ ESTA PÁGINA CONVIVE CON `/beneficios` Y NO LA REEMPLAZA.
// `/beneficios` lee la tabla `benefits`, que es el catálogo viejo: un código de
// texto fijo, igual para todo el mundo (12.1.a). Esta lee `club_beneficios`, que
// es el catálogo con comercio, límites y canje trazable. §12.4 decidió deprecar
// la primera migrando su contenido, NO romperla de entrada: es una página
// pública de entrada y hoy tiene contenido vivo.
//
// Mientras las dos existan, la regla es simple: lo que se canjea vive acá.
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Lock, LogIn, Store, Ticket } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import PantallaCanje from '@/components/Club/PantallaCanje';
import { useAuth } from '@/hooks/useAuth';
import { useMiAcceso } from '@/hooks/useContentQueries';
import { SIN_ACCESO } from '@/lib/acceso';
import { etiquetaBeneficio } from '@/lib/club';
import { getBeneficiosClub } from '@/api/clubApi';

const ClubPage = () => {
  const { user } = useAuth();
  const { data: acceso = SIN_ACCESO } = useMiAcceso(user?.id);
  const [beneficios, setBeneficios] = useState(null);
  const [error, setError] = useState(null);
  const [elegido, setElegido] = useState(null);

  React.useEffect(() => {
    let vivo = true;
    (async () => {
      const { data, error: err } = await getBeneficiosClub();
      if (!vivo) return;
      if (err) setError('No pudimos cargar los beneficios.');
      setBeneficios(data ?? []);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const tieneAcceso = Boolean(acceso?.tiene_acceso);
  // Sin sesión NO se puede canjear NADA, ni siquiera un beneficio abierto: el
  // canje se emite a nombre de una persona. Ofrecer «Usar ahora» a un visitante
  // anónimo lo mandaba a un error, que es exactamente lo que 12.3 prohíbe.
  const sinSesion = !user;
  const bloqueados = useMemo(
    () => (beneficios ?? []).filter((b) => b.requiere_acceso && !tieneAcceso).length,
    [beneficios, tieneAcceso],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <Helmet>
        <title>Club de beneficios</title>
        <meta
          name="description"
          content="Beneficios de comercios adheridos para socios con aporte vigente."
        />
      </Helmet>

      <Eyebrow>Club de beneficios</Eyebrow>
      <h1 className="mt-3 text-3xl font-display font-bold text-brand-dark sm:text-4xl">
        Beneficios para canjear
      </h1>
      <p className="mt-2 max-w-2xl text-brand-dark/70">
        Mostrá el código en el mostrador y el comercio lo confirma en el momento.
      </p>

      {/* El aviso va antes del catálogo: enterarse de que no alcanza recién en
          la caja es la peor forma de descubrirlo (12.3, casos borde). */}
      {!sinSesion && bloqueados > 0 && !tieneAcceso && (
        <div className="mt-6 flex flex-col gap-3 rounded-sm border border-brand-gold/40 bg-brand-gold/5 p-4 sm:flex-row sm:items-center sm:gap-4">
          <Lock aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-gold" />
          <p className="min-w-0 flex-1 text-sm text-brand-dark">
            {bloqueados === 1
              ? 'Hay 1 beneficio para socios con aporte vigente.'
              : `Hay ${bloqueados} beneficios para socios con aporte vigente.`}
          </p>
          <Button variant="action" asChild>
            <Link to="/collaborate">Hacer mi aporte</Link>
          </Button>
        </div>
      )}

      {sinSesion && (
        <div className="mt-6 flex flex-col gap-3 rounded-sm border border-brand-dark/15 p-4 sm:flex-row sm:items-center sm:gap-4">
          <LogIn aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-dark/60" />
          <p className="min-w-0 flex-1 text-sm text-brand-dark">
            Iniciá sesión para canjear: el código se emite a tu nombre.
          </p>
          <Button variant="action" asChild className="shrink-0">
            <Link to="/login" state={{ from: { pathname: '/club' } }}>Iniciar sesión</Link>
          </Button>
        </div>
      )}

      {error && <p role="alert" className="mt-6 text-sm text-red-600">{error}</p>}

      {beneficios === null ? (
        <p className="mt-10 text-sm text-brand-dark/60">Cargando…</p>
      ) : beneficios.length === 0 ? (
        <div className="mt-10 border-t border-brand-dark/10 py-12 text-center">
          <Store aria-hidden="true" className="mx-auto h-10 w-10 text-brand-dark/25" />
          <p className="mt-4 text-brand-dark/70">Todavía no hay beneficios publicados.</p>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-brand-dark/10 border-t border-brand-dark/10">
          {beneficios.map((b) => {
            const comercio = b.club_comercios;
            const etiqueta = etiquetaBeneficio(b);
            const bloqueado = b.requiere_acceso && !tieneAcceso;
            // Son DOS preguntas, no una: primero si hay sesión —el canje se
            // emite a nombre de alguien— y después si esa persona tiene acceso.
            const puedeUsar = !sinSesion && !bloqueado;
            return (
              // En mobile va apilado y en sm+ en fila. Con todo en una fila y el
              // botón en `shrink-0`, en un teléfono el botón se queda con el
              // ancho y el título cae a una palabra por renglón.
              <li key={b.id} className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-dark/50">
                    {comercio?.nombre}
                    {comercio?.rubro ? ` · ${comercio.rubro}` : ''}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold leading-snug text-brand-dark">
                    {b.titulo}
                  </h2>
                  {b.descripcion && (
                    <p className="mt-1 text-sm text-brand-dark/70">{b.descripcion}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:shrink-0">
                  {etiqueta && (
                    <span className="text-lg font-bold text-brand-action">{etiqueta}</span>
                  )}

                  {/* UN botón por ítem SOLO cuando la acción está disponible.
                      Si no lo está, va una etiqueta callada que dice por qué, y
                      la acción vive UNA sola vez en el aviso de arriba: repetir
                      «Iniciá sesión» en cada fila convierte la página en una
                      pared de botones rojos y esconde lo único que importa, que
                      es el beneficio.

                      Lo que NO cambia: sin acceso no se ofrece generar. Un
                      código que va a fallar en el mostrador es la forma más
                      rápida de perder un socio (12.3). */}
                  {puedeUsar ? (
                    <Button
                      variant="action"
                      className="flex-1 sm:flex-none"
                      onClick={() => setElegido(b)}
                    >
                      <Ticket aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />
                      Usar ahora
                    </Button>
                  ) : b.requiere_acceso ? (
                    <span className="flex items-center gap-1.5 text-xs text-brand-dark/50">
                      <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      Para socios
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(elegido)} onOpenChange={(abierto) => !abierto && setElegido(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Canjear beneficio</DialogTitle>
          <DialogDescription className="sr-only">
            Generá el código y mostráselo al comercio.
          </DialogDescription>
          {elegido && (
            <PantallaCanje
              beneficio={elegido}
              comercio={elegido.club_comercios}
              onCerrar={() => setElegido(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubPage;
