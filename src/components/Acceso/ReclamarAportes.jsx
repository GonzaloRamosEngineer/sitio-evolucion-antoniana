import React from 'react';
import { Gift, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useDonacionesReclamables, useReclamarDonaciones } from '@/hooks/useContentQueries';
import { formatearMeses } from '@/lib/acceso';

/**
 * "Encontramos aportes tuyos" — ROADMAP §10.18.
 *
 * POR QUÉ ESTA PANTALLA EXISTE
 * Cuatro de cada cinco donaciones llegan sin `user_id`. No es una falla de la
 * cañería —el sitio manda el id y el webhook lo lee— sino que se dona **sin
 * sesión iniciada**. El único rastro que queda es el email que informó
 * MercadoPago, y con ese rastro no alcanza para otorgar acceso solo: el email
 * del checkout lo escribe quien paga, sin que nadie lo verifique contra nada.
 *
 * De ahí el reparto de responsabilidades, que es lo que este componente
 * materializa: **la base ofrece, la persona decide.** El botón es la decisión.
 *
 * No renderiza nada cuando no hay nada que reclamar, que es el caso de casi
 * todo el mundo: una tarjeta vacía diciendo "no encontramos aportes" sería
 * ruido permanente para el 95% de las visitas.
 */
const ReclamarAportes = ({ userId }) => {
  const { toast } = useToast();
  const { data: reclamables = [], isPending } = useDonacionesReclamables(userId);

  const reclamar = useReclamarDonaciones(userId, {
    onSuccess: (r) => {
      // `vinculadas: 0` no es un fallo: es lo que devuelve un segundo clic, o
      // dos pestañas abiertas. Se avisa distinto, sin alarmar.
      if (!r?.vinculadas) {
        toast({
          title: 'No quedaba nada por vincular',
          description: 'Puede que ya los hayas reclamado desde otra pantalla.',
        });
        return;
      }
      toast({
        title: r.vinculadas === 1 ? 'Listo, tu aporte quedó vinculado' : `Listo, ${r.vinculadas} aportes vinculados`,
        description: r.meses_nuevos
          ? `Sumaste ${formatearMeses(r.meses_nuevos)} de acceso a los beneficios.`
          : 'Quedaron registrados en tu historial.',
      });
    },
    onError: (e) =>
      toast({
        title: 'No pudimos vincular tus aportes',
        description: e?.message || 'Intentalo de nuevo en un momento.',
        variant: 'destructive',
      }),
  });

  // Ojo: la query queda en `isPending` mientras está deshabilitada por falta de
  // sesión, así que sin el `Boolean(userId)` esto no se mostraría nunca.
  if (Boolean(userId) && isPending) return null;
  if (!reclamables.length) return null;

  const total = reclamables.reduce((suma, d) => suma + Number(d.monto || 0), 0);
  const meses = reclamables.reduce((suma, d) => suma + Number(d.meses_estimados || 0), 0);

  return (
    <div className="mt-8 rounded-sm border border-brand-gold/50 bg-brand-gold/10 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <Gift className="h-6 w-6 flex-shrink-0 mt-0.5 text-brand-dark" />
        <div className="flex-1">
          <h2 className="font-poppins font-bold text-xl text-brand-dark leading-tight">
            {reclamables.length === 1
              ? 'Encontramos un aporte hecho con tu email'
              : `Encontramos ${reclamables.length} aportes hechos con tu email`}
          </h2>

          <p className="mt-2 text-brand-dark/70 leading-relaxed">
            {reclamables.length === 1 ? 'Se hizo' : 'Se hicieron'} sin haber iniciado sesión, así
            que {reclamables.length === 1 ? 'no está' : 'no están'} asociado
            {reclamables.length === 1 ? '' : 's'} a tu cuenta. Son ${total.toLocaleString('es-AR')} en
            total{meses > 0 && <> y te {meses === 1 ? 'daría' : 'darían'} {formatearMeses(meses)} de acceso</>}.
          </p>

          <ul className="mt-4 space-y-1.5">
            {reclamables.map((d) => (
              <li
                key={d.donation_id}
                className="flex items-baseline justify-between gap-4 text-sm border-b border-brand-dark/10 pb-1.5 last:border-0"
              >
                <span className="text-brand-dark/60">
                  {new Date(d.fecha).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                </span>
                <span className="font-medium text-brand-dark tabular-nums">
                  ${Number(d.monto).toLocaleString('es-AR')}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Button
              variant="action"
              onClick={() => reclamar.mutate()}
              disabled={reclamar.isPending}
            >
              {reclamar.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vinculando…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {reclamables.length === 1 ? 'Es mío, vincularlo' : 'Son míos, vincularlos'}
                </>
              )}
            </Button>
          </div>

          <p className="mt-4 text-sm text-brand-dark/55 leading-relaxed">
            Solo aparecen acá los aportes hechos con el email de esta cuenta, y únicamente
            porque ya lo verificaste.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReclamarAportes;
