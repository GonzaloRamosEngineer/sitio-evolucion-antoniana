import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { esEmailPlausible } from '@/lib/aportante';

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
      <div className="mb-8 rounded-sm border border-brand-primary/25 bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <UserCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-primary" />
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-brand-dark/75">
              Vas a aportar como <span className="font-semibold text-brand-dark">{user.name || user.email}</span>.
              Tu aporte queda registrado a tu nombre y suma para{' '}
              <Link to="/carnet" className="font-bold text-brand-primary underline underline-offset-4">
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
                className="mt-2 text-xs font-semibold text-brand-primary underline underline-offset-4"
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
                  className="mt-2 h-11 max-w-md rounded-xl border-gray-200 bg-white text-brand-dark focus:border-brand-primary focus:ring-brand-primary"
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
    <div className="mb-8 rounded-sm border border-brand-gold/50 bg-brand-gold/10 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <IdCard className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-dark" />
        <div className="flex-1">
          <h3 className="font-poppins text-base font-bold leading-tight text-brand-dark">
            ¿Tenés cuenta? Iniciá sesión antes de aportar
          </h3>
          <p className="mt-2 max-w-[46rem] text-sm leading-relaxed text-brand-dark/70">
            Aportar con la sesión iniciada es lo que hace que el aporte quede a tu nombre:
            suma para tu antigüedad y te habilita los beneficios del club. Si aportás sin
            sesión, el aporte entra igual —y se agradece igual— pero no hay forma de saber
            que fue tuyo.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* `state.from` es el mecanismo que LoginPage ya usa para volver a
                donde estabas. Sin esto, iniciar sesión te deja en el panel que
                corresponda a tu rol y perdés el aporte que ibas a hacer. */}
            <Link to="/login" state={{ from: { pathname: '/collaborate' } }}>
              <Button variant="action" size="sm">Iniciar sesión</Button>
            </Link>
            <Link
              to="/register"
              className="text-sm font-bold text-brand-primary underline underline-offset-4"
            >
              Crear una cuenta
            </Link>
          </div>

          <div className="mt-6 border-t border-brand-dark/10 pt-5">
            <Label htmlFor="email-aportante" className="font-semibold text-brand-dark">
              ¿Preferís aportar sin cuenta? Dejanos tu email
            </Label>
            <p className="mt-1 text-sm leading-relaxed text-brand-dark/60">
              Es opcional. Sirve para que puedas vincular este aporte más adelante, si
              alguna vez creás tu cuenta con ese mismo email.
            </p>
            <Input
              id="email-aportante"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="mt-2 h-11 max-w-md rounded-xl border-gray-200 bg-white text-brand-dark focus:border-brand-primary focus:ring-brand-primary"
            />
            {/* Avisa, no bloquea: el botón de donar sigue habilitado y el aporte
                entra igual, solo que sin este dato. */}
            {emailEscrito && !emailSirve && (
              <p className="mt-2 text-sm text-red-600">
                Eso no parece un email. Revisalo, o dejalo vacío y aportá igual.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvisoSesion;
