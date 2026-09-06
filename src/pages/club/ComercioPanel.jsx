// src/pages/club/ComercioPanel.jsx
//
// El panel del mostrador (ROADMAP §12.3). Es la pantalla que queda abierta en el
// teléfono del local, así que se diseña para eso: un solo campo, botones
// grandes, y el resultado en letra que se lee de un vistazo mientras hay alguien
// esperando del otro lado.
//
// EL ESCÁNER ES UN ATAJO, NO EL CAMINO. Se usa `BarcodeDetector`, que ya viene
// en el navegador (Android/Chrome) y no existe en iOS. Cuando no está, el botón
// de escanear directamente no aparece y queda el campo de tipear, que es el
// camino que §12.3 pide igual y funciona en cualquier teléfono. Ninguna
// dependencia nueva para esto.
//
// Quién entra acá lo decide la BASE, no esta página: `mis_comercios()` resuelve
// por `auth.uid()`. Si devuelve vacío, no hay panel. La ruta además exige sesión.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  BarChart3, Camera, CheckCircle2, Loader2, Receipt, RotateCcw, ScanLine, Store,
  TriangleAlert, Undo2, XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eyebrow } from '@/components/ui/eyebrow';
import ReporteComercio from '@/components/Club/ReporteComercio';
import { anularCanje, confirmarCanje, getCanjesDelComercio, getMisComercios } from '@/api/clubApi';
import { agruparCodigo, esCodigoValido, mensajeDeError, normalizarCodigo } from '@/lib/club';

const hayEscaner = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

const ComercioPanel = () => {
  const [comercios, setComercios] = useState(null);
  const [comercio, setComercio] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [codigo, setCodigo] = useState('');
  const [monto, setMonto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, mensaje, socio, beneficio }
  const [canjes, setCanjes] = useState([]);

  // «Validar» es lo primero SIEMPRE: esta pantalla se abre con alguien
  // esperando del otro lado del mostrador. El reporte es para después del
  // turno, así que entra como segunda solapa y nunca como pantalla inicial.
  const [vista, setVista] = useState('validar');

  // Anulación (§12.10.6): `codigo` del canje que se está anulando, o null.
  const [anulando, setAnulando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [anulaError, setAnulaError] = useState(null);

  const [escaneando, setEscaneando] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  /* ---------------- Qué comercio opera esta persona ---------------- */
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await getMisComercios();
      if (!vivo) return;
      setComercios(data ?? []);
      setComercio((data ?? [])[0] ?? null);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const refrescarCanjes = useCallback(async (comercioId) => {
    if (!comercioId) return;
    const { data } = await getCanjesDelComercio(comercioId, { limite: 15 });
    setCanjes(data ?? []);
  }, []);

  useEffect(() => {
    if (comercio?.comercio_id) refrescarCanjes(comercio.comercio_id);
  }, [comercio?.comercio_id, refrescarCanjes]);

  /* ---------------- Confirmar ---------------- */
  const confirmar = useCallback(
    async (codigoAConfirmar) => {
      const limpio = normalizarCodigo(codigoAConfirmar);
      if (!esCodigoValido(limpio)) {
        setResultado({ ok: false, mensaje: 'Ese código no tiene el formato correcto.' });
        return;
      }
      setEnviando(true);
      setResultado(null);

      const { data, error } = await confirmarCanje(limpio, {
        monto: monto === '' ? null : Number(monto),
      });
      setEnviando(false);

      if (error) {
        setResultado({ ok: false, mensaje: mensajeDeError(data, 'No se pudo confirmar.') });
        return;
      }
      if (data?.ya_estaba) {
        setResultado({ ok: true, mensaje: data.mensaje ?? 'Este canje ya estaba confirmado.' });
      } else {
        setResultado({
          ok: true,
          mensaje: 'Canje confirmado',
          socio: data?.socio,
          beneficio: data?.beneficio?.titulo,
          rescate: data?.rescate_tardio,
        });
      }
      setCodigo('');
      setMonto('');
      refrescarCanjes(comercio?.comercio_id);
    },
    [monto, comercio?.comercio_id, refrescarCanjes],
  );

  /* ---------------- Anular (§12.10.6) ---------------- */
  //
  // LA VENTANA NO SE VALIDA ACÁ, Y ES A PROPÓSITO. `anulacion_ventana_minutos`
  // vive en `club_config` y la hace cumplir `club-anular-canje`. Duplicar el
  // cálculo en el browser para esconder el botón crearía la misma trampa que
  // §12.11 documenta —la regla viviendo dos veces— pero sin ninguna ventaja:
  // el botón escondido no protege nada (la autoridad es la función igual) y el
  // día que cambie el parámetro, la pantalla y la base dirían cosas distintas.
  // Se ofrece siempre sobre un canje confirmado, y si la ventana pasó, el
  // servidor contesta con la frase que además dice qué hacer.
  const anular = useCallback(
    async (canje) => {
      const texto = motivo.trim();
      if (texto.length < 3) {
        setAnulaError('Escribí por qué se anula.');
        return;
      }
      setEnviando(true);
      setAnulaError(null);

      const { data, error } = await anularCanje(canje.codigo, texto);
      setEnviando(false);

      if (error) {
        setAnulaError(mensajeDeError(data, 'No se pudo anular.'));
        return;
      }
      setAnulando(null);
      setMotivo('');
      setResultado({
        ok: true,
        mensaje: data?.ya_estaba ? 'Este canje ya estaba anulado.' : 'Canje anulado',
      });
      refrescarCanjes(comercio?.comercio_id);
    },
    [motivo, comercio?.comercio_id, refrescarCanjes],
  );

  /* ---------------- Escáner ---------------- */
  const detenerEscaner = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
    setEscaneando(false);
  }, []);

  const escanear = useCallback(async () => {
    if (!hayEscaner()) return;
    setResultado(null);
    setEscaneando(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // eslint-disable-next-line no-undef
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const buscar = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codigos = await detector.detect(videoRef.current);
          const leido = normalizarCodigo(codigos?.[0]?.rawValue);
          if (esCodigoValido(leido)) {
            detenerEscaner();
            setCodigo(leido);
            confirmar(leido);
            return;
          }
        } catch {
          /* un frame ilegible no es un error: se sigue mirando */
        }
        requestAnimationFrame(buscar);
      };
      requestAnimationFrame(buscar);
    } catch {
      detenerEscaner();
      setResultado({
        ok: false,
        mensaje: 'No pudimos usar la cámara. Escribí el código a mano.',
      });
    }
  }, [confirmar, detenerEscaner]);

  useEffect(() => detenerEscaner, [detenerEscaner]);

  /* ---------------- Render ---------------- */
  if (cargando) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Loader2 aria-hidden="true" className="mx-auto h-6 w-6 animate-spin text-brand-dark/40" />
      </div>
    );
  }

  // La pertenencia la resuelve la base. Acá solo se explica el vacío.
  if (!comercios?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Store aria-hidden="true" className="mx-auto h-10 w-10 text-brand-dark/30" />
        <h1 className="mt-4 text-2xl font-display font-bold text-brand-dark">
          Esta cuenta no tiene un comercio asociado
        </h1>
        <p className="mt-2 text-sm text-brand-dark/70">
          Si tu comercio forma parte del club, pedile a la Fundación que asocie este usuario.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Helmet>
        <title>Validar beneficios</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Eyebrow>Mostrador</Eyebrow>
      <h1 className="mt-3 text-3xl font-display font-bold text-brand-dark">
        Validar un beneficio
      </h1>
      <p className="mt-1 text-sm text-brand-dark/70">{comercio?.nombre}</p>

      {comercios.length > 1 && (
        <div className="mt-4">
          <Label htmlFor="comercio" className="text-brand-dark font-semibold">Comercio</Label>
          <select
            id="comercio"
            className="mt-1 w-full rounded-sm border border-brand-dark/20 bg-white p-2 text-sm"
            value={comercio?.comercio_id ?? ''}
            onChange={(e) =>
              setComercio(comercios.find((c) => c.comercio_id === e.target.value) ?? null)
            }
          >
            {comercios.map((c) => (
              <option key={c.comercio_id} value={c.comercio_id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* ---- Validar / Mis números ---- */}
      <div className="mt-6 flex gap-2 border-b border-brand-dark/10">
        {[
          { clave: 'validar', etiqueta: 'Validar', icono: ScanLine },
          { clave: 'reporte', etiqueta: 'Mis números', icono: BarChart3 },
        ].map(({ clave, etiqueta, icono: Icono }) => (
          <button
            key={clave}
            type="button"
            onClick={() => setVista(clave)}
            className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition ${
              vista === clave
                ? 'border-brand-dark text-brand-dark'
                : 'border-transparent text-brand-dark/50 hover:text-brand-dark/80'
            }`}
          >
            <Icono aria-hidden="true" className="h-4 w-4" />
            {etiqueta}
          </button>
        ))}
      </div>

      {vista === 'reporte' ? (
        <div className="mt-8">
          <ReporteComercio comercioId={comercio?.comercio_id} />
        </div>
      ) : (
       <>
      {/* ---- Resultado, arriba de todo: es lo que se mira con gente esperando ---- */}
      {resultado && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-6 flex items-start gap-3 rounded-sm border p-4 ${
            resultado.ok ? 'border-green-600/40 bg-green-50' : 'border-red-600/40 bg-red-50'
          }`}
        >
          {resultado.ok ? (
            <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 text-green-600" />
          ) : (
            <XCircle aria-hidden="true" className="h-6 w-6 shrink-0 text-red-600" />
          )}
          <div>
            <p className={`text-lg font-semibold ${resultado.ok ? 'text-green-800' : 'text-red-800'}`}>
              {resultado.mensaje}
            </p>
            {resultado.socio && (
              <p className="text-sm text-brand-dark/80">
                {resultado.socio}
                {resultado.beneficio ? ` · ${resultado.beneficio}` : ''}
              </p>
            )}
            {resultado.rescate && (
              <p className="mt-1 text-xs text-brand-dark/60">
                Se confirmó un código que ya había vencido.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---- Escanear ---- */}
      {escaneando ? (
        <div className="mt-6 space-y-3">
          <video
            ref={videoRef}
            className="w-full rounded-sm border border-brand-dark/10 bg-black"
            muted
            playsInline
          />
          <Button variant="outline" onClick={detenerEscaner} className="w-full">
            Cancelar
          </Button>
        </div>
      ) : (
        hayEscaner() && (
          <Button variant="action" onClick={escanear} className="mt-6 w-full py-6 text-base">
            <Camera aria-hidden="true" className="mr-2 h-5 w-5" />
            Escanear el QR
          </Button>
        )
      )}

      {/* ---- Tipear ---- */}
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          confirmar(codigo);
        }}
      >
        <div>
          <Label htmlFor="codigo" className="text-brand-dark font-semibold">
            Código del socio
          </Label>
          <Input
            id="codigo"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ZK4 M2P"
            value={codigo}
            onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
            className="mt-1 font-mono text-2xl tracking-[0.2em] uppercase h-16 text-center"
          />
        </div>

        <div>
          <Label htmlFor="monto" className="text-brand-dark font-semibold">
            Monto de la operación <span className="font-normal text-brand-dark/60">(opcional)</span>
          </Label>
          <Input
            id="monto"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="$"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="mt-1"
          />
          {/* No se exige a propósito (12.9.2): si se pide de entrada, el cajero
              lo completa con cualquier número y el dato deja de servir. */}
          <p className="mt-1 text-xs text-brand-dark/60">
            Sirve para el reporte que te muestra cuánta gente te trajo el club.
          </p>
        </div>

        <Button
          type="submit"
          variant="action"
          className="w-full py-6 text-base"
          disabled={enviando || !esCodigoValido(codigo)}
        >
          {enviando ? (
            <>
              <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
              Confirmando…
            </>
          ) : (
            'Confirmar'
          )}
        </Button>
      </form>

      {/* ---- Últimos canjes ---- */}
      <section className="mt-12">
        <div className="flex items-center justify-between border-b border-brand-dark/10 pb-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark/70">
            <Receipt aria-hidden="true" className="h-4 w-4" />
            Últimos movimientos
          </h2>
          <button
            type="button"
            onClick={() => refrescarCanjes(comercio?.comercio_id)}
            className="flex items-center gap-1 text-xs text-brand-dark/60 hover:text-brand-dark"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" />
            Actualizar
          </button>
        </div>

        {canjes.length === 0 ? (
          <p className="py-6 text-sm text-brand-dark/60">Todavía no hay canjes.</p>
        ) : (
          <ul className="divide-y divide-brand-dark/10">
            {canjes.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-dark">
                      {c.club_beneficios?.titulo}
                    </p>
                    <p className="text-xs text-brand-dark/60">
                      <span className="font-mono">{agruparCodigo(c.codigo)}</span>
                      {c.users?.name ? ` · ${c.users.name}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        c.estado === 'confirmado'
                          ? 'text-green-700'
                          : c.estado === 'anulado'
                            ? 'text-red-700'
                            : 'text-brand-dark/50'
                      }`}
                    >
                      {c.estado}
                    </span>
                    {/* Solo sobre confirmados: un pendiente no se anula, vence
                        solo, y ese vencimiento es la métrica de adopción (§12.3). */}
                    {c.estado === 'confirmado' && anulando !== c.codigo && (
                      <button
                        type="button"
                        onClick={() => {
                          setAnulando(c.codigo);
                          setMotivo('');
                          setAnulaError(null);
                        }}
                        className="flex items-center gap-1 text-xs text-brand-dark/60 underline hover:text-red-700"
                      >
                        <Undo2 aria-hidden="true" className="h-3 w-3" />
                        Anular
                      </button>
                    )}
                  </div>
                </div>

                {/* El motivo es obligatorio y lo exige también la Edge Function:
                    una anulación sin motivo es indistinguible de un error de
                    operación, y es justo lo que después hay que poder auditar. */}
                {anulando === c.codigo && (
                  <div className="mt-3 rounded-sm border border-red-600/30 bg-red-50 p-3">
                    <Label htmlFor={`motivo-${c.id}`} className="text-brand-dark font-semibold">
                      ¿Por qué se anula?
                    </Label>
                    <Input
                      id={`motivo-${c.id}`}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Se cayó la venta"
                      className="mt-1 bg-white"
                    />
                    {anulaError && <p className="mt-2 text-xs text-red-800">{anulaError}</p>}
                    <p className="mt-2 text-xs text-brand-dark/60">
                      El canje no se borra: queda registrado como anulado, con el motivo y
                      quién lo hizo.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={enviando}
                        onClick={() => anular(c)}
                      >
                        {enviando ? 'Anulando…' : 'Anular el canje'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAnulando(null);
                          setAnulaError(null);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* Los pendientes que nunca se confirman NO son un error: son la señal de
            que el local no está usando el sistema (12.3). Se muestran a propósito. */}
        <p className="mt-4 flex items-start gap-2 text-xs text-brand-dark/50">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
          Los códigos que quedan en «pendiente» son los que el socio generó y nadie confirmó.
        </p>
      </section>
      </>
      )}
    </div>
  );
};

export default ComercioPanel;
