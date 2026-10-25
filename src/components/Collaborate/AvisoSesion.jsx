import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { esEmailPlausible } from '@/lib/aportante';
import { RUTAS } from '@/config/rutas';

/**
 * "Aportá con tu cuenta" — ROADMAP §10.18 punto 2.
 *
 * POR QUÉ EXISTE, Y POR QUÉ ES LO QUE MÁS MUEVE LA AGUJA
 *
 * El backfill del 2026-08-30 lo dejó medido: de cinco donaciones reales, **tres
 * no dejaron ningún rastro** de quién las hizo y una sola quedó atribuida a una
 * persona. El acceso al club se otorga por aporte, así que un aporte anónimo es
 * plata que entra y no le habilita nada a nadie.
 *
 * La causa no era técnica —la cañería del `user_id` siempre estuvo entera— sino
 * que esta página **nunca dijo que aportar con sesión iniciada sirve para algo**.
 * Reclamar (§10.19) repara hacia atrás; esto evita el problema.
 *
 * LO QUE ESTE COMPONENTE NO HACE, Y ES DELIBERADO: no bloquea. Pedir cuenta
 * antes de donar era el camino 3 de §10.17 y sigue siendo el peor — para una
 * fundación que necesita que donar sea fácil, la fricción cuesta más de lo que
 * rinde la atribución. Acá se informa y se ofrece; donar sin nada de esto sigue
 * estando a un clic.
 *
 * EL EMAIL ES EL SEGUNDO MEJOR CAMINO. Quien no quiere crear una cuenta puede
 * dejar su email y reclamar el aporte más adelante. Es opcional de verdad: si
 * está vacío, o si no parece un email, se dona igual (`Collaborate` cae al
 * placeholder de siempre). Un dato accesorio nunca puede impedir un cobro.
 *
 * Y CON SESIÓN TAMBIÉN SE PUEDE CAMBIAR EL EMAIL (§10.24, 2026-09-02). No es
 * una opción de más: es la salida de un callejón real. El email de la sesión
 * del dueño del proyecto está registrado en **MercadoPago Uruguay**, y una
 * cuenta de otro país no puede pagarle a un cobrador argentino — MercadoPago
 * devuelve `guest_site_mismatch`. Con el email de la sesión fijo, el único
 * email posible era justamente el que no funcionaba, y no había ninguna salida
 * dentro del sitio: hubo que averiguarlo por fuera y suscribirse con otra
 * cuenta.
 *
 * Va **plegado** a propósito. Que exista una salida no significa ponerla en el
 * camino de todos: la mayoría no la necesita, y un campo de email extra arriba
 * del botón de aportar es fricción para el 99% que no tiene el problema.
 */
const AvisoSesion = ({ user, email, onEmailChange }) => {
  // Solo controla si el campo está a la vista. El valor vive en `Collaborate`,
  // que es quien lo manda al checkout.
  const [otroEmail, setOtroEmail] = useState(false);

  const emailEscrito = email.trim().length > 0;
  const emailSirve = esEmailPlausible(email);

  if (user) {
    return (
      <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <UserCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-primary" />
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-brand-dark/75">
              Vas a aportar como <span className="font-semibold text-brand-dark">{user.name || user.email}</span>.
              Tu aporte queda registrado a tu nombre y suma para{' '}
              <Link to={RUTAS.mi.carnet} className="font-bold text-brand-primary underline underline-offset-4">
                tu carnet
              </Link>
              .
            </p>

            {/*
              La salida del callejón, plegada. Se muestra el email que va a
              viajar cuando hay uno escrito, porque si no, "pagar con otro
              email" quedaría abierto sin ninguna señal de que está en uso.
            */}
            {!otroEmail && !emailEscrito ? (
              <button
                type="button"
                onClick={() => setOtroEmail(true)}
              className="mt-1 min-h-[44px] text-sm font-semibold text-brand-primary underline underline-offset-4"
              >
                Pagar con otro email
              </button>
            ) : (
              <div className="mt-4 border-t border-brand-dark/10 pt-4">
                <Label htmlFor="email-pago" className="font-semibold text-brand-dark">
                  Email para el pago
                </Label>
                <p className="mt-1 max-w-[46rem] text-sm leading-relaxed text-brand-dark/60">
                  Solo si tu cuenta de MercadoPago está en otro país, o si querés pagar
                  desde otra cuenta. <span className="font-semibold text-brand-dark/75">Tu
                  aporte igual queda a tu nombre</span> — la atribución no depende de este
                  email.
                </p>
                {/*
                  ⚠️ El placeholder es GENÉRICO y no `user.email`, que fue el
                  primer intento. Un placeholder con el email real de la persona
                  **se lee como un campo ya completado**: parece que el dato está
                  puesto y no hace falta escribir nada, justo en el campo cuyo
                  único motivo de existir es escribir OTRO email. El email de la
                  sesión ya se dice arriba («Vas a aportar como…») y se repite en
                  el aviso de error, que es donde sirve.
                */}
                <Input
                  id="email-pago"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="otro@email.com"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="mt-2 h-11 text-base max-w-md rounded-xl border-gray-200 bg-white text-brand-dark focus:border-brand-primary focus:ring-brand-primary"
                />
                {emailEscrito && !emailSirve && (
                  <p className="mt-2 text-sm text-red-600">
                    Eso no parece un email. Revisalo, o dejalo vacío y se usa {user.email}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <Label htmlFor="email-aportante" className="font-semibold text-brand-dark">
        Tu email (opcional)
      </Label>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        Nos ayuda a identificar tu aporte y vincularlo a tu cuenta si la creás después.
      </p>
      <Input
        id="email-aportante"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        className="mt-2 h-11 text-base max-w-md rounded-xl border-gray-200 bg-white text-brand-dark focus:border-brand-primary focus:ring-brand-primary"
      />
      {emailEscrito && !emailSirve && (
        <p className="mt-2 text-sm text-red-600">
          Eso no parece un email. Revisalo, o dejalo vacío y aportá igual.
        </p>
      )}
      <p className="mt-3 text-sm text-gray-600">
        ¿Ya tenés cuenta?{' '}
        <Link to={RUTAS.auth.ingresar} state={{ from: { pathname: RUTAS.colaborar } }} className="font-semibold text-brand-primary underline underline-offset-4">
          Iniciá sesión
        </Link>
        {' · '}
        <Link to={RUTAS.auth.registrarse} className="font-semibold text-brand-primary underline underline-offset-4">
          Crear una cuenta
        </Link>
      </p>
    </div>
  );
};

export default AvisoSesion;
