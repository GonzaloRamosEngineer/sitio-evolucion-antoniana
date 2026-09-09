import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subirAvatar, quitarAvatar } from '@/api/avatarApi';
import {
  LADO_SALIDA, MIME_SALIDA, CALIDAD_SALIDA,
  escalaCover, limitarOffset, rectoFuente, reencuadrar, offsetCentrado,
} from '@/lib/recorte';

/*
  SUBIR Y RECORTAR LA FOTO DE PERFIL (§10.23.e)
  ---------------------------------------------------------------------------
  POR QUÉ NO HAY DETECCIÓN DE ROSTRO, que es lo que se pidió primero. El
  `FaceDetector` del navegador es en la práctica solo Chrome detrás de un flag,
  así que centrar la cara sola obliga a embarcar un modelo (MediaPipe o
  face-api: entre 1 y 3 MB) en un panel al que, de 72 socias, entraron 6. Lo que
  la detección daba —que la cara quede centrada— lo da este recortador con zoom
  y arrastre, que pesa 0 KB y encima deja que la persona elija su encuadre en
  vez de adivinárselo. La decisión completa está en `ROADMAP.md`.

  POR QUÉ EL RECORTE SE HACE EN EL CLIENTE. Lo que se sube ya es el cuadrado
  final de 512x512 en WebP: decenas de KB en vez de los 3-8 MB que pesa una foto
  de cámara de celular. Sin eso, cada socio subiría el archivo completo por
  datos móviles para que después se muestre a 64 px.

  LA MATEMÁTICA NO ESTÁ ACÁ, está en `src/lib/recorte.js` y testeada. Este
  archivo es la pantalla: eventos, estado y el `drawImage`.
*/

/** Lado del visor en px de CSS. 288 entra cómodo en 393 con el padding del modal. */
const LADO_VISOR = 288;

/** Hasta 4x. Más que eso sobre una foto de celular ya se ve el pixelado. */
const ZOOM_MAX = 4;

/**
 * 8 MB de entrada. No es el límite de lo que se guarda —eso son 512x512— sino
 * de lo que se lee en memoria: un HEIC de 12 MP en un celular viejo con varias
 * pestañas abiertas puede tumbar la pestaña, y ahí no hay mensaje de error que
 * mostrar porque se murió el intérprete.
 */
const MAX_ENTRADA = 8 * 1024 * 1024;

const AvatarUpload = ({ user, onUpdateSuccess }) => {
  const [src, setSrc] = useState(null);       // object URL del archivo elegido
  const [medidas, setMedidas] = useState(null); // { iw, ih }
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ ox: 0, oy: 0 });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const imgRef = useRef(null);
  const arrastre = useRef(null);

  const cover = medidas ? escalaCover(LADO_VISOR, medidas.iw, medidas.ih) : 0;
  const escala = cover * zoom;

  /*
    El object URL es memoria del navegador y no se libera solo. Sin este
    `revoke`, elegir seis fotos hasta encontrar la buena deja seis bitmaps
    completos retenidos — en un celular eso se nota.
  */
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const elegir = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el MISMO archivo
    if (!file) return;

    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Ese archivo no es una imagen.');
      return;
    }
    if (file.size > MAX_ENTRADA) {
      setError('La imagen es muy grande. Probá con una de menos de 8 MB.');
      return;
    }
    if (src) URL.revokeObjectURL(src);
    setMedidas(null);
    setZoom(1);
    setSrc(URL.createObjectURL(file));
  };

  /* Las medidas reales recién existen después del `load`. */
  const alCargar = () => {
    const el = imgRef.current;
    if (!el?.naturalWidth) return;
    const iw = el.naturalWidth;
    const ih = el.naturalHeight;
    setMedidas({ iw, ih });
    setOffset(offsetCentrado({ lado: LADO_VISOR, iw, ih, escala: escalaCover(LADO_VISOR, iw, ih) }));
  };

  const cambiarZoom = (nuevo) => {
    if (!medidas) return;
    const escalaNueva = cover * nuevo;
    setOffset(reencuadrar({
      lado: LADO_VISOR, iw: medidas.iw, ih: medidas.ih, escala, ...offset, escalaNueva,
    }));
    setZoom(nuevo);
  };

  /*
    Pointer events y no mouse/touch por separado: un solo camino para dedo,
    mouse y lápiz. `setPointerCapture` es lo que hace que el arrastre siga
    funcionando cuando el dedo se va afuera del visor, que es lo que pasa
    siempre cuando el visor mide 288 px y la pantalla 393.
  */
  const empezar = (e) => {
    if (!medidas) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, ...offset };
  };

  const mover = useCallback((e) => {
    const a = arrastre.current;
    if (!a || !medidas) return;
    setOffset(limitarOffset({
      lado: LADO_VISOR, iw: medidas.iw, ih: medidas.ih, escala,
      ox: a.ox + (e.clientX - a.x),
      oy: a.oy + (e.clientY - a.y),
    }));
  }, [medidas, escala]);

  const terminar = () => { arrastre.current = null; };

  const guardar = async () => {
    if (!medidas || !imgRef.current) return;
    const recorte = rectoFuente({ lado: LADO_VISOR, iw: medidas.iw, ih: medidas.ih, escala, ...offset });
    if (!recorte) return;

    setGuardando(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = LADO_SALIDA;
      canvas.height = LADO_SALIDA;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        imgRef.current,
        recorte.sx, recorte.sy, recorte.sw, recorte.sh,
        0, 0, LADO_SALIDA, LADO_SALIDA,
      );

      const blob = await new Promise((res) => canvas.toBlob(res, MIME_SALIDA, CALIDAD_SALIDA));
      if (!blob) throw new Error('El navegador no pudo preparar la imagen.');

      const { data, error: errSubida } = await subirAvatar(user.id, blob);
      if (errSubida) throw errSubida;

      if (src) URL.revokeObjectURL(src);
      setSrc(null);
      setMedidas(null);
      onUpdateSuccess?.(data);
    } catch (e) {
      // El mensaje va a la pantalla: si esto falla en silencio, la persona
      // vuelve a intentarlo pensando que no apretó bien.
      setError(e?.message || 'No pudimos guardar la foto. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    setGuardando(true);
    setError(null);
    const { data, error: err } = await quitarAvatar(user.id, user.avatar_path);
    setGuardando(false);
    if (err) { setError('No pudimos quitar la foto. Probá de nuevo.'); return; }
    onUpdateSuccess?.(data);
  };

  return (
    <div className="space-y-3">
      {src && (
        <div className="space-y-3">
          {/*
            El visor. `touch-none` es imprescindible: sin él, arrastrar dentro
            del recuadro scrollea la página en el celular y la foto no se mueve.
          */}
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-full border border-gray-300 bg-brand-sand"
            style={{ width: LADO_VISOR, height: LADO_VISOR }}
            onPointerDown={empezar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerCancel={terminar}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Encuadrá tu foto"
              onLoad={alCargar}
              draggable={false}
              className="absolute left-0 top-0 max-w-none origin-top-left select-none"
              style={medidas ? {
                width: medidas.iw * escala,
                height: medidas.ih * escala,
                transform: `translate(${offset.ox}px, ${offset.oy}px)`,
              } : { visibility: 'hidden' }}
            />
          </div>

          <p className="text-center text-xs text-gray-500">
            Arrastrá para mover y usá el deslizador para acercar.
          </p>

          <label className="flex items-center gap-3">
            <ZoomIn aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="sr-only">Acercar la foto</span>
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              disabled={!medidas}
              onChange={(e) => cambiarZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-brand-primary"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={guardar}
              disabled={guardando || !medidas}
              className="min-h-[44px] flex-1 rounded-xl bg-brand-primary font-bold text-white hover:bg-brand-dark"
            >
              {guardando ? <><Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Usar esta foto'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { if (src) URL.revokeObjectURL(src); setSrc(null); setMedidas(null); setError(null); }}
              disabled={guardando}
              className="min-h-[44px] rounded-xl border-gray-300"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!src && (
        <div className="flex flex-wrap gap-2">
          {/*
            `accept="image/*"` con `capture` ausente a propósito: en un celular
            el sistema ofrece cámara Y galería, y forzar `capture="user"`
            obligaría a sacarse una foto en el momento a quien ya tiene una
            elegida.
          */}
          <label className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-brand-primary hover:bg-brand-sand">
            <Camera aria-hidden="true" className="h-4 w-4" />
            {user?.avatar_path ? 'Cambiar mi foto' : 'Subir mi foto'}
            <input type="file" accept="image/*" onChange={elegir} className="sr-only" />
          </label>

          {user?.avatar_path && (
            <Button
              type="button"
              variant="outline"
              onClick={quitar}
              disabled={guardando}
              className="min-h-[44px] rounded-xl border-gray-300 text-gray-600"
            >
              <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default AvatarUpload;
