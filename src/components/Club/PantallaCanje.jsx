// src/components/Club/PantallaCanje.jsx
//
// La pantalla que el socio le muestra al cajero (ROADMAP §12.3).
//
// Tres decisiones que vienen del flujo y no son de diseño:
//
//  1. LA ADVERTENCIA VA ANTES DE GENERAR. El código vive minutos, así que si la
//     persona lo genera en el colectivo llega a la caja con el reloj en cero.
//     Por eso hay un paso previo que lo dice, y el botón recién aparece ahí.
//
//  2. LA CONFIRMACIÓN LLEGA SOLA. Cuando el cajero confirma, esta pantalla pasa
//     a verde sin que nadie recargue nada (Supabase Realtime). El socio ve que
//     quedó registrado y el cajero ve que el socio lo vio: esa confirmación
//     cruzada es lo que hace que el sistema se sienta real y no un trámite.
//
//  3. EL CÓDIGO SE MUESTRA PARTIDO ('ZK4 M2P') y en grande. Es lo que se dicta
//     cuando el QR no se puede escanear, que en un mostrador pasa seguido.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clock, Loader2, QrCode, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { generarCanje } from '@/api/clubApi';
import {
  agruparCodigo,
  estadoCanje,
  etiquetaBeneficio,
  formatearCuenta,
  mensajeDeError,
  segundosRestantes,
} from '@/lib/club';

const PantallaCanje = ({ beneficio, comercio, sucursalId = null, onCerrar }) => {
  const [paso, setPaso] = useState('aviso'); // aviso | generando | activo | listo | error
  const [canje, setCanje] = useState(null);
  const [error, setError] = useState(null);
  const [ahora, setAhora] = useState(() => new Date());
  const canalRef = useRef(null);

  const etiqueta = useMemo(() => etiquetaBeneficio(beneficio), [beneficio]);
  const estado = estadoCanje(canje, ahora);
  const restantes = canje ? segundosRestantes(canje.expira_en, ahora) : 0;

  // El reloj corre en el cliente. La base es la autoridad sobre el vencimiento
  // real; esto es lo que la persona ve, y por eso alcanza con un tick por segundo.
  useEffect(() => {
    if (paso !== 'activo') return undefined;
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, [paso]);

  // Realtime sobre ESTE canje. Si la suscripción falla, la pantalla no miente:
  // sigue mostrando el código y el contador, que es lo que el cajero necesita.
  useEffect(() => {
    if (!canje?.id || paso !== 'activo') return undefined;

    const canal = supabase
      .channel(`club_canje_${canje.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'club_canjes', filter: `id=eq.${canje.id}` },
        (payload) => {
          const nuevo = payload?.new;
          if (nuevo?.estado === 'confirmado') {
            setCanje((prev) => ({ ...prev, ...nuevo }));
            setPaso('listo');
          }
        },
      )
      .subscribe();

    canalRef.current = canal;
    return () => {
      supabase.removeChannel(canal);
      canalRef.current = null;
    };
  }, [canje?.id, paso]);

  const pedirCodigo = useCallback(async () => {
    setPaso('generando');
    setError(null);
    const { data, error: err } = await generarCanje(beneficio.id, sucursalId);
    if (err) {
      setError(mensajeDeError(data, 'No se pudo generar el código.'));
      setPaso('error');
      return;
    }
    setCanje(data);
    setAhora(new Date());
    setPaso('activo');
  }, [beneficio.id, sucursalId]);

  /* ---------------- Paso 1: la advertencia ---------------- */
  if (paso === 'aviso' || paso === 'generando' || paso === 'error') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-dark">{beneficio.titulo}</h2>
          <p className="mt-1 text-sm text-brand-dark/70">
            {comercio?.nombre}
            {etiqueta && <span className="ml-2 font-semibold text-brand-action">{etiqueta}</span>}
          </p>
        </div>

        {beneficio.terminos && (
          <div className="border-t border-brand-dark/10 pt-4">
            <p className="text-sm text-brand-dark/80 whitespace-pre-line">{beneficio.terminos}</p>
          </div>
        )}

        <div className="flex gap-3 rounded-sm border border-brand-gold/40 bg-brand-gold/5 p-4">
          <Clock aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-gold" />
          <p className="text-sm text-brand-dark">
            <strong className="font-semibold">Generalo recién cuando estés en la caja.</strong>{' '}
            El código vence a los pocos minutos y después hay que pedir uno nuevo.
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="action" onClick={pedirCodigo} disabled={paso === 'generando'}>
            {paso === 'generando' ? (
              <>
                <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <QrCode aria-hidden="true" className="mr-2 h-4 w-4" />
                {paso === 'error' ? 'Probar de nuevo' : 'Estoy en la caja, generar código'}
              </>
            )}
          </Button>
          {onCerrar && (
            <Button variant="outline" onClick={onCerrar}>
              Volver
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- Paso 3: confirmado ---------------- */
  if (paso === 'listo') {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 aria-hidden="true" className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-dark">¡Listo!</h2>
          <p className="mt-1 text-sm text-brand-dark/70">
            Tu beneficio en {comercio?.nombre} quedó registrado.
          </p>
        </div>
        {onCerrar && (
          <Button variant="action" onClick={onCerrar}>
            Volver a los beneficios
          </Button>
        )}
      </div>
    );
  }

  /* ---------------- Paso 2: el código vivo ---------------- */
  const vencido = estado === 'vencido';
  const porVencer = estado === 'por_vencer';

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-xl font-display font-bold text-brand-dark">{beneficio.titulo}</h2>
        <p className="mt-1 text-sm text-brand-dark/70">{comercio?.nombre}</p>
      </div>

      {vencido ? (
        <div className="space-y-4 rounded-sm border border-brand-dark/15 p-8">
          <p className="text-lg font-semibold text-brand-dark">Este código venció</p>
          <p className="text-sm text-brand-dark/70">
            Generá uno nuevo cuando estés listo para pagar.
          </p>
          <Button variant="action" onClick={pedirCodigo}>
            Generar otro
          </Button>
        </div>
      ) : (
        <>
          {/* El QR es un atajo, no el canal: el dato que vale es el código, y
              por eso va abajo en grande y legible. */}
          <div className="mx-auto w-fit rounded-sm border border-brand-dark/10 bg-white p-4">
            <QRCodeSVG value={canje.codigo} size={200} level="M" marginSize={0} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-brand-dark/50">
              o dictale este código
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.2em] text-brand-dark">
              {agruparCodigo(canje.codigo)}
            </p>
          </div>

          <p
            aria-live="polite"
            className={`text-sm font-semibold ${porVencer ? 'text-red-600' : 'text-brand-dark/70'}`}
          >
            Vence en {formatearCuenta(restantes)}
          </p>

          <p className="text-xs text-brand-dark/60">
            Esperá a que el comercio confirme. Esta pantalla se actualiza sola.
          </p>
        </>
      )}

      {onCerrar && (
        <Button variant="outline" onClick={onCerrar}>
          Volver
        </Button>
      )}
    </div>
  );
};

export default PantallaCanje;
