// src/pages/club/ClubPage.jsx
//
// EL MOSTRADOR DEL SOCIO (ROADMAP §12 fase 2).
//
// ⚠️ POR QUÉ ESTA PÁGINA CONVIVE CON `/beneficios`, RESUELTO EL 2026-09-06.
//
// El comentario que estaba acá decía que `/beneficios` era «el catálogo viejo,
// con un código de texto fijo». Dejó de ser cierto el 2026-09-02, cuando la
// unificación (§12.10.16) hizo que las DOS páginas leyeran `club_beneficios`.
// §12.10.14 dejó la pregunta abierta —«o son dos vistas con trabajos distintos
// y hay que decirlo, o una sobra»— y quedó abierta dos jornadas. Se decidió:
//
//   /beneficios  LA VIDRIERA. Pública e indexable, con slug propio y preview de
//                OG. Es a donde llega alguien que todavía no aporta, y por eso
//                es la que está en el nav. Su trabajo es convencer.
//   /club        EL MOSTRADOR. Canjear, y ver los canjes propios. Su trabajo es
//                que el socio use lo que ya pagó.
//
// De ahí sale que esta NO esté en el nav público: mandar a un visitante a una
// pantalla de canje es ofrecerle algo que no puede usar. Se llega desde el
// carnet, desde el dashboard y desde el CTA de un beneficio.
//
// La regla de §11.4 —«una pantalla nueva que habla de algo que otra ya
// explicaba: preguntá de dónde saca el dato»— es lo que hizo falta acá: las dos
// sacan el dato del mismo lugar, y lo que cambiaba era para quién.
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { History, Lock, LogIn, Store, Ticket } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import PantallaCanje from '@/components/Club/PantallaCanje';
import { useAuth } from '@/hooks/useAuth';
import { useMiAcceso } from '@/hooks/useContentQueries';
import { SIN_ACCESO } from '@/lib/acceso';
import { agruparCodigo, etiquetaBeneficio } from '@/lib/club';
import { getBeneficiosClub, getMisCanjes } from '@/api/clubApi';

const ClubPage = () => {
  const { user } = useAuth();
  const { data: acceso = SIN_ACCESO } = useMiAcceso(user?.id);
  const [beneficios, setBeneficios] = useState(null);
  const [error, setError] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [misCanjes, setMisCanjes] = useState([]);

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

  // EL HISTORIAL PROPIO — `getMisCanjes()` existía desde la fase 2 y NO LA
  // LLAMABA NADIE. Es la regla 5 del ROADMAP en su versión chica: escribir la
  // función no es conectarla. Y su lugar natural es esta página, que es la del
  // socio: el comercio ve los suyos en `/comercio` y la entidad todos en
  // `/admin`, pero la persona no tenía dónde ver qué canjeó.
  React.useEffect(() => {
    if (!user) {
      setMisCanjes([]);
      return undefined;
    }
    let vivo = true;
    (async () => {
      const { data } = await getMisCanjes({ limite: 10 });
      if (vivo) setMisCanjes(data ?? []);
    })();
    return () => {
      vivo = false;
    };
    // Se recarga al cerrar la pantalla de canje: si acaba de generar uno, tiene
    // que aparecer sin recargar la página.
  }, [user, elegido]);

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
        Generá el código cuando ya estés en la caja y el comercio lo confirma en el momento.
        {' '}
        <Link to="/beneficios" className="font-semibold underline underline-offset-4">
          Ver todos los beneficios
        </Link>
        .
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

      {/* ---- Mis canjes ---- */}
      {misCanjes.length > 0 && (
        <section className="mt-16">
          <h2 className="flex items-center gap-2 border-b border-brand-dark/10 pb-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark/70">
            <History aria-hidden="true" className="h-4 w-4" />
            Mis canjes
          </h2>
          <ul className="divide-y divide-brand-dark/10">
            {misCanjes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-dark">
                    {c.club_beneficios?.titulo}
                  </p>
                  <p className="text-xs text-brand-dark/60">
                    {c.club_beneficios?.club_comercios?.nombre}
                    {' · '}
                    <span className="font-mono">{agruparCodigo(c.codigo)}</span>
                  </p>
                </div>
                {/* Los estados se muestran tal cual, incluido 'expirado'. Un
                    canje que venció sin usarse es información para la persona
                    —«lo generaste y no lo usaste»— y no un error que esconder. */}
                <span
                  className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${
                    c.estado === 'confirmado'
                      ? 'text-green-700'
                      : c.estado === 'anulado'
                        ? 'text-red-700'
                        : 'text-brand-dark/50'
                  }`}
                >
                  {c.estado}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
