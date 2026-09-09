import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit3, ShieldCheck, Star, Mail, Fingerprint, Calendar, Clock, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import EditProfileModal from './EditProfileModal';
import { useMiAcceso, useMiAntiguedad, useAvatarUrl } from '@/hooks/useContentQueries';
import { avatarDe } from '@/lib/avatar';
import {
  SIN_ACCESO, etiquetaEstado, claseEstado, nombreOrigen, formatearMeses, formatearFecha,
} from '@/lib/acceso';

/*
  QUÉ CAMBIÓ ACÁ Y POR QUÉ (§10.23, 2026-09-02)
  ---------------------------------------------------------------------
  Esta cabecera INVENTABA la condición del socio. Tenía su propia
  consulta a `memberships` y de ahí derivaba una taxonomía que no existe
  en ninguna parte del sistema:

      activeMembership ? 'MEMBRESÍA ACTIVA' : 'SOCIO NIVEL BASE'
      Rango: activeMembership ? 'Padrino' : 'Miembro'
      Socio desde: new Date(user.created_at).getFullYear()   // ¡la CUENTA!

  Tres problemas, y el tercero era un bug:

  1. **No hay tabla `socios` ni `categorias_socio`** (§10.1.a sigue
     abierto). «NIVEL BASE» y «RANGO: PADRINO» prometían una jerarquía
     que el sistema no tiene y que nadie podía subir de nivel.

  2. **«Socio desde» era el año de creación de la CUENTA**, no del primer
     aporte, con un `'2025'` hardcodeado de fallback. Por eso el mismo
     día esta pantalla decía «SOCIO DESDE 2025» y `/carnet` decía «parte
     de la comunidad desde el 2 de septiembre de 2026»: dos fuentes de
     verdad para la misma pregunta, como `/beneficios` y `/club`.

  3. **`.eq('status','active').maybeSingle()`** revienta con más de una
     fila, y desde que se permite una membresía viva POR DESTINO eso es
     alcanzable. El error se tragaba en un `logger.error` y la pantalla
     le decía «SOCIO NIVEL BASE» a alguien con dos suscripciones activas:
     el `else` que adivina, otra vez (`estadosPago.js`).

  AHORA: la condición sale de `mi_acceso()` / `mi_antiguedad()`, la misma
  capa que usa `/carnet` (§10). El dashboard **pregunta y punto** — es la
  regla 1 de §12.7 aplicada acá.

  ⚠️ Y la consulta a `memberships` NO se reemplazó por otra: se BORRÓ.
  `Dashboard.jsx` ya las carga con `useUserMemberships` para las tarjetas
  de suscripción, así que esta cabecera las recibe por prop. Había dos
  consultas de lo mismo, y solo una tenía el bug.
*/
const DashboardHeader = ({ user, onUpdateSuccess, memberships = [] }) => {
  /*
    LOS TRES ESTADOS DE LA CONSULTA (§10.23.b, 2026-09-09)
    -------------------------------------------------------------------
    `= SIN_ACCESO` es el default para cuando la respuesta LLEGÓ y dice
    que no hay aporte. No servía para las otras dos situaciones: cuando
    todavía no llegó, y cuando falló. Sin distinguirlas, una consulta
    caída se veía **idéntica** a «nunca aportaste»: badge apagado y
    «ACTIVAR MEMBRESÍA» a un socio vigente, o sea invitándolo a pagar de
    nuevo algo que ya paga. Es el `else` que adivina de §12.7, en la
    pantalla donde adivinar sale más caro.

    ⚠️ `isPending` NO alcanza solo: la query lleva `enabled: Boolean(userId)`
    y una query deshabilitada se queda en `isPending` para siempre
    (`useContentQueries.js`). Sin el `Boolean(user?.id)`, una cabecera sin
    sesión diría «Consultando tus aportes…» eternamente. Misma combinación
    que ya hace `ReclamarAportes`.
  */
  const accesoQuery = useMiAcceso(user?.id);
  const { data: acceso = SIN_ACCESO } = accesoQuery;
  const accesoCargando = Boolean(user?.id) && accesoQuery.isPending;
  const accesoFallo = accesoQuery.isError;
  const accesoConocido = !accesoCargando && !accesoFallo;

  const { data: antiguedad } = useMiAntiguedad(user?.id);

  /*
    La foto propia vive en un bucket privado, así que su URL se firma y vence:
    la resuelve `useAvatarUrl` a partir de `users.avatar_path` (§10.23.e).

    Mientras se firma, `avatarDe` cae al dibujo por género — y eso es lo
    correcto acá y no un «no sé» como el del acceso: mostrar el dibujo medio
    segundo y después la foto es un reemplazo, no una afirmación falsa. Lo que
    NO se puede hacer es dejar el hueco en blanco.

    `null` = no hay foto ni dibujo que corresponda → van las iniciales. El
    porqué de que «otro / prefiero no decir» caiga ahí está en `lib/avatar.js`.
  */
  const { data: urlFoto } = useAvatarUrl(user?.avatar_path);
  const foto = avatarDe(user, urlFoto);

  const esSocio = Boolean(acceso?.tiene_acceso);

  /*
    Una suscripción cobrándose todavía NO es acceso, y tampoco es "no
    aportaste nunca". Es el estado que vio el dueño del proyecto al
    suscribirse: entre que MercadoPago crea el `preapproval` y que avisa
    del primer cobro pasan un par de minutos, y en esa ventana la
    pantalla le ofrecía «ACTIVAR MEMBRESÍA» a alguien que acababa de
    suscribirse. Sin este caso, el CTA miente en el peor momento.
  */
  const suscripcionEnCurso = (memberships ?? []).some((m) =>
    ['pending', 'active'].includes(m?.status));

  const getInitials = (name) => {
    if (!name && user?.email) return user.email[0].toUpperCase();
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0][0]?.toUpperCase();
    return (names[0][0] + names[names.length - 1][0])?.toUpperCase();
  };

  return (
    /*
      POR QUÉ ESTA TARJETA YA NO ES NAVY (§10.23.c, 2026-09-09)
      -------------------------------------------------------------------
      `Dashboard.jsx` abre con una banda `bg-brand-dark` que dice «Mi panel
      / Hola, <nombre>». Esta tarjeta iba pegada abajo, también navy, y
      TODO lo que sigue —la navegación de secciones, las suscripciones, el
      historial— es `bg-white` sobre `bg-brand-sand`. O sea: dos bloques
      oscuros apilados y después el panel entero claro. La tarjeta no era
      un acento, era una isla, y encima repetía el nombre que la banda de
      arriba ya había dicho tres centímetros antes.

      La app es **light-only** desde la Sesión G (ver `CLAUDE.md`): no hay
      dos temas entre los que elegir, hay una gramática y esta tarjeta
      estaba afuera. Ahora usa la misma que sus hermanas —blanco,
      `rounded-2xl`, borde `gray-200` hairline— y el navy queda donde
      significa algo: la banda del hero y los CTA.

      Lo que se fue, y por qué:
      - **La corona sobre el avatar.** Marcaba `esSocio` con una insignia
        de jerarquía, justo lo que §10.23 sacó del texto («Rango:
        Padrino/Miembro», una taxonomía que el sistema no tiene). El
        estado del aporte ya lo dice el badge, con la palabra exacta.
      - **El aura pulsante y los dos blobs desenfocados.** Son los
        clichés que el «Lenguaje visual» del repo enumera para no usar.
      - **`uppercase tracking-tighter` en el nombre.** Un nombre propio no
        se grita, y en mobile «GONZARAMOS MP» a 393 px es lo primero que
        se ve del panel.

      Lo que NO se fue, porque la iteración anterior lo perdió sin querer:
      el layout de desktop (`lg:` en las dos grillas — quedaba una columna
      angosta y altísima), la animación de entrada, y los cuatro datos.
    */
    <motion.section
      aria-label="Mi perfil y mis aportes"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      {/* ---------- QUIÉN SOS ---------- */}
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {/*
              La foto se puede abrir en grande. Va como <button> y no como un
              <div> con onClick: se llega con Tab, se activa con Enter y el
              lector de pantalla anuncia que es accionable.

              Y solo es accionable SI HAY FOTO. Con las iniciales no hay nada
              que ampliar, así que ahí el avatar es un adorno y ofrecer un
              clic que abre un cuadro con «GR» más grande sería una promesa
              vacía — la misma familia que el CTA que miente de §10.23.b.
            */}
            {foto ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Ver mi foto de perfil en grande"
                    className="shrink-0 rounded-full ring-offset-2 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <Avatar className="h-16 w-16 border border-gray-200 lg:h-20 lg:w-20">
                      {/* `alt=""`: el nombre está al lado en texto, y un lector
                          de pantalla que lea las dos cosas lo dice dos veces.
                          Lo que hace falta anunciar es el botón, y eso ya lo
                          dice su `aria-label`. */}
                      <AvatarImage src={foto} alt="" className="object-cover" />
                      <AvatarFallback className="bg-brand-sand text-xl font-bold text-brand-primary">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[min(90vw,26rem)] overflow-hidden rounded-2xl border-none bg-white p-0">
                  <DialogTitle className="sr-only">Mi foto de perfil</DialogTitle>
                  <img
                    src={foto}
                    alt={`Foto de perfil de ${user?.name || 'la persona asociada'}`}
                    className="block h-auto w-full bg-brand-sand object-contain"
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Avatar className="h-16 w-16 shrink-0 border border-gray-200 lg:h-20 lg:w-20">
                <AvatarFallback className="bg-brand-sand text-xl font-bold text-brand-primary">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="min-w-0">
              <h2 className="break-words font-poppins text-xl font-bold leading-tight tracking-tight text-brand-dark sm:text-2xl">
                {user?.name || user?.email?.split('@')[0] || 'Usuario'}
              </h2>
              <p className="mt-1.5 flex items-center gap-2 break-all text-sm text-gray-600">
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
                {user?.email || 'Sin registrar'}
              </p>
            </div>
          </div>

          <dl className="shrink-0 border-t border-gray-200 pt-4 lg:border-0 lg:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 lg:block">
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Fingerprint aria-hidden="true" className="h-3.5 w-3.5" />
                Documento
              </dt>
              <dd className="font-semibold text-brand-dark lg:mt-1">{user?.dni || 'Sin registrar'}</dd>
            </div>
          </dl>
        </div>

        <EditProfileModal user={user} onUpdateSuccess={onUpdateSuccess}>
          <Button
            variant="outline"
            className="mt-5 min-h-[44px] w-full rounded-xl border-gray-300 font-semibold text-brand-primary hover:bg-brand-sand hover:text-brand-dark lg:w-auto lg:px-6"
          >
            <Edit3 aria-hidden="true" className="mr-2 h-4 w-4" />
            Editar perfil
          </Button>
        </EditProfileModal>
      </div>

      {/* ---------- CÓMO VAS CON TU APORTE ---------- */}
      <div className="border-t border-gray-200 bg-brand-sand/50 p-5 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-poppins text-base font-bold text-brand-dark">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-primary" />
            Mi aporte
          </h3>
          {/*
            El badge se calla mientras no sabe. «Sin aportes» es una
            afirmación sobre la persona, y no se puede afirmar con una
            consulta en vuelo o caída (§10.23.b).
          */}
          {accesoConocido && (
            <Badge className={`shrink-0 rounded-full border-none px-3 py-1 text-xs font-semibold ${claseEstado(acceso)}`}>
              {etiquetaEstado(acceso)}
            </Badge>
          )}
        </div>

        {/*
          Cargando y falla van PRIMERO: `esSocio` sale de
          `acceso.tiene_acceso`, y ese `false` no significa «no es socio»
          hasta que la consulta contestó (§10.23.b).
        */}
        {accesoCargando ? (
          <p role="status" className="mt-4 text-sm text-gray-600">
            Consultando tus aportes…
          </p>
        ) : accesoFallo ? (
          <div role="alert" className="mt-4 text-sm">
            <p className="text-gray-600">No pudimos consultar tu acceso.</p>
            <button
              type="button"
              onClick={() => accesoQuery.refetch()}
              className="mt-1 min-h-[44px] font-semibold text-brand-primary underline"
            >
              Volver a intentar
            </button>
          </div>
        ) : (
          <>
            {/*
              Mobile: filas etiqueta→valor. Desktop: tres columnas.
              A 393 px una grilla de dos columnas parte «2 de septiembre de
              2026» en dos líneas y «ORIGEN DEL APORTE» también — es lo que
              se veía en la captura del iPhone que originó todo esto.
            */}
            <dl className="mt-5 grid grid-cols-1 gap-y-3 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-5">
              {/*
                Era «Rango: Padrino/Miembro», una jerarquía inventada.
                Ahora dice de dónde viene el acceso, que es un dato real
                de `aportes.origen` y el mismo que muestra el carnet.
              */}
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 lg:block">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  Origen del aporte
                </dt>
                <dd className="font-semibold text-brand-dark lg:mt-1">{nombreOrigen(acceso?.origen) ?? 'Sin registrar'}</dd>
              </div>

              {/*
                `socio_desde` sale del PRIMER APORTE, no de la fecha de
                alta de la cuenta. Son cosas distintas y la diferencia se
                nota: hay 23 cuentas y 6 aportes.
              */}
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 lg:block">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                  Aportando desde
                </dt>
                <dd className="font-semibold text-brand-dark lg:mt-1">{formatearFecha(antiguedad?.socio_desde) ?? 'Sin registrar'}</dd>
              </div>

              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 lg:block">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                  Tiempo aportado
                </dt>
                <dd className="font-semibold text-brand-dark lg:mt-1">
                  {antiguedad?.socio_desde ? formatearMeses(antiguedad.meses_aportados) : 'Sin registrar'}
                </dd>
              </div>
            </dl>

            {/*
              CINCO estados, no dos (eran tres hasta §10.23.b). El botón
              anterior era `!activeMembership && "ACTIVAR MEMBRESÍA"`, así
              que le pedía suscribirse a quien acababa de suscribirse y a
              quien aporta por donación.

              Y con acceso el destino es `/carnet`: la credencial existe y
              no se llegaba a ella desde acá — la misma familia de
              §12.10.20, piezas que funcionan sin estar conectadas.
            */}
            {esSocio ? (
              <Button asChild className="mt-6 min-h-[48px] w-full rounded-xl bg-brand-primary font-bold text-white hover:bg-brand-dark lg:w-auto lg:px-8">
                <Link to="/carnet">
                  <IdCard aria-hidden="true" className="mr-2 h-4 w-4" />
                  Ver mi carnet
                </Link>
              </Button>
            ) : suscripcionEnCurso ? (
              <div className="mt-5 rounded-xl border border-brand-primary/20 bg-white p-4">
                <p className="text-sm font-bold text-brand-dark">Suscripción en curso</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Tu acceso se habilita en cuanto se acredite el primer cobro.
                </p>
              </div>
            ) : (
              <Button asChild className="mt-6 min-h-[48px] w-full rounded-xl bg-brand-primary font-bold text-white hover:bg-brand-dark lg:w-auto lg:px-8">
                <Link to="/collaborate">
                  <Star aria-hidden="true" className="mr-2 h-4 w-4 fill-brand-gold text-brand-gold" />
                  Activar membresía
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </motion.section>
  );
};

export default DashboardHeader;
