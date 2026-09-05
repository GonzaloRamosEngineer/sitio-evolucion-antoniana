import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMiPrecioActividad } from '@/hooks/useContentQueries';
import { figura } from '@/lib/miembro';

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

/**
 * El precio de una actividad, para quien la está mirando (ROADMAP §10.1.d).
 *
 * ⚠️ ESTE COMPONENTE NO CALCULA NADA. El número sale de
 * `mi_precio_actividad()`, que es la única fuente de la regla: si es miembro
 * activo, si su categoría da descuento, y si la actividad fija un precio propio
 * de miembro. Calcularlo acá sería una segunda verdad sobre una cifra que
 * alguien va a pagar — la versión cara del bug de §10.23.
 *
 * NO RENDERIZA NADA CUANDO LA ACTIVIDAD ES GRATIS, y esa es la decisión de
 * diseño que importa. Al 2026-09-05 las 12 actividades de la Fundación son
 * gratuitas, así que un cartel que diga "Gratis" en las doce sería ruido
 * permanente y, peor, sugeriría que en algún momento no lo son. Cuando exista
 * la primera actividad arancelada, el componente aparece solo.
 */
const PrecioActividad = ({ activityId, className = '' }) => {
  const { user } = useAuth();
  const { data: precio } = useMiPrecioActividad(activityId, user?.id);

  if (!precio || precio.es_gratis) return null;

  const general = Number(precio.precio_general || 0);
  const final = Number(precio.precio_final || 0);
  const tieneDescuento = final < general;

  return (
    <div className={`rounded-sm border border-brand-dark/10 bg-white p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <Ticket className="h-5 w-5 flex-shrink-0 mt-0.5 text-brand-primary" />
        <div className="flex-1">
          <span className="block text-xs font-bold uppercase tracking-widest text-brand-dark/45">
            Tu precio
          </span>

          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-poppins font-bold text-2xl text-brand-dark tabular-nums">
              {pesos(final)}
            </span>
            {/* El precio tachado solo si de verdad hay una diferencia. Tachar el
                mismo número dos veces es el truco de vidriera que resta
                credibilidad justo donde hace falta. */}
            {tieneDescuento && (
              <span className="text-brand-dark/45 line-through tabular-nums">{pesos(general)}</span>
            )}
          </div>

          <p className="mt-1 text-sm text-brand-dark/60">{precio.motivo}</p>

          {/* La invitación aparece solo si NO tiene el descuento: ofrecerle a un
              miembro que se haga miembro es la clase de mensaje que hace que la
              pantalla parezca no saber con quién habla. */}
          {!tieneDescuento && (
            <p className="mt-3 text-sm text-brand-dark/60 leading-relaxed">
              Siendo {figura()} podés tener un precio menor.{' '}
              <Link
                to="/collaborate"
                className="font-bold text-brand-primary underline underline-offset-4"
              >
                Ver cómo sumarte
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrecioActividad;
