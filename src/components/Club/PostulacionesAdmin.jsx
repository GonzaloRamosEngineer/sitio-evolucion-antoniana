// src/components/Club/PostulacionesAdmin.jsx
//
// La bandeja de entrada del club (§12.10.5). Lo que llega del formulario
// público de `/club/postular` aterriza acá y no en el catálogo.
//
// EL BOTÓN QUE IMPORTA ES «CREAR EL COMERCIO». Sin él, esta pantalla sería una
// lista de correos que alguien tiene que volver a tipear en el ABM — y volver a
// tipear es donde se pierden los datos y donde el módulo vuelve a necesitar un
// desarrollador. Al crearlo:
//
//   * el comercio nace en 'pendiente', NO en 'activo'. §12.3 dice que el
//     beneficio se redacta junto al comercio y que al principio esa redacción
//     la controla la entidad: publicar automáticamente saltearía justo el paso
//     donde se evitan los conflictos de mostrador.
//   * la postulación queda ligada por `comercio_id`, así que después se puede
//     contestar «¿de dónde salió este comercio?».
//
// LO QUE ESTA PANTALLA NO HACE: mandar la invitación. Eso vive en el detalle
// del comercio, porque primero hay que acordar el beneficio y recién después
// tiene sentido darle acceso al mostrador. Fusionar los dos pasos haría que un
// comercio pudiera validar canjes de un beneficio que todavía no existe.
import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, Mail, MapPin, Phone, Store, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import EmptyState from '@/components/Admin/shared/EmptyState';
import {
  ESTADOS_POSTULACION, createComercio, listPostulaciones, revisarPostulacion, slugify,
} from '@/api/clubAdminApi';

const COLOR = {
  nueva: 'bg-amber-100 text-amber-800',
  en_conversacion: 'bg-blue-100 text-blue-800',
  aprobada: 'bg-green-100 text-green-800',
  rechazada: 'bg-slate-100 text-slate-700',
};

const Dato = ({ icono: Icono, children, href }) => {
  if (!children) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-brand-dark/70">
      <Icono aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-brand-dark/40" />
      {href ? (
        <a href={href} className="underline underline-offset-2 hover:text-brand-dark">
          {children}
        </a>
      ) : (
        children
      )}
    </p>
  );
};

const PostulacionesAdmin = ({ onComercioCreado }) => {
  const [filas, setFilas] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const { data } = await listPostulaciones();
    setFilas(data ?? []);
  };

  useEffect(() => {
    cargar();
  }, []);

  // Las nuevas primero aunque sean más viejas: una postulación sin mirar es lo
  // único de esta lista que exige una acción.
  const ordenadas = useMemo(() => {
    if (!filas) return null;
    const peso = { nueva: 0, en_conversacion: 1, aprobada: 2, rechazada: 3 };
    return [...filas].sort((a, b) => (peso[a.estado] ?? 9) - (peso[b.estado] ?? 9));
  }, [filas]);

  const sinRevisar = (filas ?? []).filter((p) => p.estado === 'nueva').length;

  const cambiarEstado = async (postulacion, estado) => {
    setGuardando(true);
    const { error } = await revisarPostulacion(postulacion.id, { estado, notas: notas || null });
    setGuardando(false);
    if (error) {
      toast({ title: 'No se pudo guardar', variant: 'destructive' });
      return;
    }
    toast({ title: 'Postulación actualizada' });
    cargar();
  };

  const crearComercio = async (postulacion) => {
    setGuardando(true);
    const { data: comercio, error } = await createComercio({
      nombre: postulacion.nombre,
      slug: slugify(postulacion.nombre),
      rubro: postulacion.rubro || null,
      descripcion: postulacion.propuesta,
      // Nace pendiente: el beneficio se redacta junto al comercio antes de
      // publicar nada (§12.3).
      estado: 'pendiente',
    });

    if (error) {
      setGuardando(false);
      // El caso frecuente es el slug repetido: dos comercios con el mismo
      // nombre. Decirlo es más útil que «no se pudo».
      toast({
        title: 'No se pudo crear el comercio',
        description: 'Puede que ya exista uno con ese nombre. Crealo a mano desde el ABM.',
        variant: 'destructive',
      });
      return;
    }

    await revisarPostulacion(postulacion.id, {
      estado: 'aprobada',
      notas: notas || null,
      comercioId: comercio.id,
    });
    setGuardando(false);
    toast({
      title: 'Comercio creado',
      description: 'Quedó en «Pendiente». Cargale el beneficio y después invitá al mostrador.',
    });
    cargar();
    onComercioCreado?.();
  };

  if (filas === null) {
    return (
      <div className="py-8 text-center">
        <Loader2 aria-hidden="true" className="mx-auto h-5 w-5 animate-spin text-brand-dark/40" />
      </div>
    );
  }

  if (filas.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No hay postulaciones"
        description="Cuando un comercio complete el formulario de /club/postular, va a aparecer acá."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sinRevisar > 0 && (
        <p className="text-sm font-semibold text-amber-800">
          {sinRevisar} sin revisar
        </p>
      )}

      <ul className="divide-y divide-brand-dark/10 rounded-sm border border-brand-dark/10">
        {ordenadas.map((p) => (
          <li key={p.id} className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => {
                setAbierta(abierta === p.id ? null : p.id);
                setNotas(p.notas ?? '');
              }}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-brand-dark">{p.nombre}</p>
                <p className="truncate text-xs text-brand-dark/60">
                  {p.rubro ? `${p.rubro} · ` : ''}
                  {new Date(p.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
              <Badge className={COLOR[p.estado] ?? ''}>
                {ESTADOS_POSTULACION.find((e) => e.valor === p.estado)?.etiqueta ?? p.estado}
              </Badge>
            </button>

            {abierta === p.id && (
              <div className="mt-4 space-y-4 border-t border-brand-dark/10 pt-4">
                <div className="space-y-1">
                  <Dato icono={Mail} href={`mailto:${p.contacto_email}`}>
                    {p.contacto_nombre ? `${p.contacto_nombre} · ${p.contacto_email}` : p.contacto_email}
                  </Dato>
                  <Dato icono={Phone} href={p.contacto_telefono ? `tel:${p.contacto_telefono}` : null}>
                    {p.contacto_telefono}
                  </Dato>
                  <Dato icono={MapPin}>{p.direccion}</Dato>
                  <Dato icono={Globe} href={p.sitio_web}>{p.sitio_web}</Dato>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark/50">
                    Qué propone
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-brand-dark/80">
                    {p.propuesta}
                  </p>
                </div>

                <div>
                  <Label htmlFor={`notas-${p.id}`} className="text-brand-dark font-semibold">
                    Notas internas
                  </Label>
                  <Textarea
                    id={`notas-${p.id}`}
                    rows={2}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="mt-1"
                    placeholder="Con quién se habló, qué quedó pendiente…"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={p.estado}
                    onValueChange={(v) => cambiarEstado(p, v)}
                    disabled={guardando}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_POSTULACION.map((e) => (
                        <SelectItem key={e.valor} value={e.valor}>{e.etiqueta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Solo si todavía no generó un comercio: el botón no puede
                      ofrecer crear dos veces el mismo. */}
                  {!p.comercio_id && (
                    <Button size="sm" disabled={guardando} onClick={() => crearComercio(p)}>
                      <Store aria-hidden="true" className="mr-2 h-4 w-4" />
                      Crear el comercio
                    </Button>
                  )}
                  {p.comercio_id && (
                    <span className="text-xs text-brand-dark/60">
                      Ya tiene un comercio creado.
                    </span>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PostulacionesAdmin;
