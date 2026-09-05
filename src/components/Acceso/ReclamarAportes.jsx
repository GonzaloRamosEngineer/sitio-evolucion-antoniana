import React from 'react';
import { Gift, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  useDonacionesReclamables,
  useHuellasReclamables,
  useReclamarHuellas,
} from '@/hooks/useContentQueries';
import { formatearMeses } from '@/lib/acceso';

/**
 * "Encontramos cosas tuyas" — ROADMAP §10.18 y §10.1.c.
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
 * ⚠️ AMPLIADO EL 2026-09-05, y el número justifica el cambio. Las donaciones
 * eran 5. Las preinscripciones a Educación hechas sin cuenta son **160, con 156
 * emails distintos**, y solo 4 de esas personas tienen usuario. La huella más
 * común que deja alguien en este sitio no era la que esta pantalla sabía
 * reconocer.
 *
 * LA DISTINCIÓN QUE NO SE PUEDE PERDER: un aporte otorga acceso; una
 * preinscripción **no**. Vincularla es reconocer a una persona, no darle
 * beneficios. Por eso el texto habla de "quedan asociadas a tu cuenta" y nunca
 * promete meses cuando no los hay — prometer acceso que no llega es peor que no
 * ofrecer nada.
 *
 * No renderiza nada cuando no hay nada que reclamar, que es el caso de casi
 * todo el mundo: una tarjeta vacía diciendo "no encontramos nada" sería ruido
 * permanente para la mayoría de las visitas.
 */
const ReclamarAportes = ({ userId }) => {
  const { toast } = useToast();
  const { data: aportes = [], isPending: cargandoAportes } = useDonacionesReclamables(userId);
  const { data: huellas = [], isPending: cargandoHuellas } = useHuellasReclamables(userId);

  const reclamar = useReclamarHuellas(userId, {
    onSuccess: (filas = []) => {
      const vinculadas = filas.reduce((s, f) => s + Number(f.vinculadas || 0), 0);
      const meses = filas.reduce((s, f) => s + Number(f.meses_nuevos || 0), 0);

      // `vinculadas: 0` no es un fallo: es lo que devuelve un segundo clic, o
      // dos pestañas abiertas. Se avisa distinto, sin alarmar.
      if (!vinculadas) {
        toast({
          title: 'No quedaba nada por vincular',
          description: 'Puede que ya lo hayas reclamado desde otra pantalla.',
        });
        return;
      }

      toast({
        title: vinculadas === 1 ? 'Listo, quedó vinculado a tu cuenta' : `Listo, ${vinculadas} cosas vinculadas`,
        description: meses
          ? `Sumaste ${formatearMeses(meses)} de acceso a los beneficios.`
          : 'Quedaron asociadas a tu cuenta y las vas a ver en tu historial.',
      });
    },
    onError: (e) =>
      toast({
        title: 'No pudimos vincular',
        description: e?.message || 'Intentalo de nuevo en un momento.',
        variant: 'destructive',
      }),
  });

  // Ojo: las queries quedan en `isPending` mientras están deshabilitadas por
  // falta de sesión, así que sin el `Boolean(userId)` esto no se mostraría nunca.
  if (Boolean(userId) && (cargandoAportes || cargandoHuellas)) return null;

  const cantidadHuellas = huellas.reduce((s, h) => s + Number(h.cantidad || 0), 0);
  const total = aportes.length + cantidadHuellas;
  if (!total) return null;

  const montoTotal = aportes.reduce((suma, d) => suma + Number(d.monto || 0), 0);
  const mesesTotal = aportes.reduce((suma, d) => suma + Number(d.meses_estimados || 0), 0);

  // El título nombra lo que MÁS hay. Con una sola donación y doce
  // preinscripciones, encabezar con "un aporte" sería describir la minoría.
  const titulo =
    total === 1
      ? 'Encontramos algo hecho con tu email'
      : `Encontramos ${total} cosas hechas con tu email`;

  return (
    <div className="mt-8 rounded-sm border border-brand-gold/50 bg-brand-gold/10 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <Gift className="h-6 w-6 flex-shrink-0 mt-0.5 text-brand-dark" />
        <div className="flex-1">
          <h2 className="font-poppins font-bold text-xl text-brand-dark leading-tight">{titulo}</h2>

          <p className="mt-2 text-brand-dark/70 leading-relaxed">
            {total === 1 ? 'Se hizo' : 'Se hicieron'} sin haber iniciado sesión, así que{' '}
            {total === 1 ? 'no está asociado' : 'no están asociadas'} a tu cuenta.
            {aportes.length > 0 && (
              <>
                {' '}
                Hay ${montoTotal.toLocaleString('es-AR')} en aportes
                {mesesTotal > 0 && (
                  <>
                    {' '}
                    que te {mesesTotal === 1 ? 'daría' : 'darían'} {formatearMeses(mesesTotal)} de
                    acceso
                  </>
                )}
                .
              </>
            )}
          </p>

          <ul className="mt-4 space-y-1.5">
            {aportes.map((d) => (
              <li
                key={d.donation_id}
                className="flex items-baseline justify-between gap-4 text-sm border-b border-brand-dark/10 pb-1.5 last:border-0"
              >
                <span className="text-brand-dark/60">
                  Aporte del{' '}
                  {new Date(d.fecha).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                </span>
                <span className="font-medium text-brand-dark tabular-nums">
                  ${Number(d.monto).toLocaleString('es-AR')}
                </span>
              </li>
            ))}

            {huellas.map((h) => (
              <li
                key={h.tabla}
                className="flex items-baseline justify-between gap-4 text-sm border-b border-brand-dark/10 pb-1.5 last:border-0"
              >
                <span className="text-brand-dark/60">{h.etiqueta}</span>
                <span className="font-medium text-brand-dark tabular-nums">
                  {h.cantidad === 1 ? '1' : h.cantidad}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Button variant="action" onClick={() => reclamar.mutate()} disabled={reclamar.isPending}>
              {reclamar.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vinculando…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {total === 1 ? 'Es mío, vincularlo' : 'Son míos, vincularlos'}
                </>
              )}
            </Button>
          </div>

          <p className="mt-4 text-sm text-brand-dark/55 leading-relaxed">
            Solo aparece acá lo que se hizo con el email de esta cuenta, y únicamente porque ya
            lo verificaste.
            {cantidadHuellas > 0 && aportes.length === 0 && (
              <> Vincularlo no cambia tu acceso a beneficios: sirve para que te reconozcamos.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReclamarAportes;
