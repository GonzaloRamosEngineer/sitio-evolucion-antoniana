// src/components/Admin/DestinosAdmin.jsx
//
// CRUD de destinos (ROADMAP §10.9). Un destino es aquello a lo que se le puede
// dar plata: una campaña puntual, algo o alguien padrinable, o la entidad misma.
//
// Dos decisiones de esta pantalla que no son cosméticas:
//
//  1. La visibilidad del beneficiario se muestra SIEMPRE, con su advertencia, y
//     arranca en 'anonimizado'. Es la decisión con consecuencias sobre personas
//     reales —y sobre menores— así que no se esconde detrás de "opciones
//     avanzadas". Ver §10.8.
//  2. Un destino con aportes no se puede borrar: la base lo rechaza (FK
//     RESTRICT) y acá directamente no se ofrece el botón. Es un libro contable.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Trash2, Edit, Loader2, AlertTriangle, Users, Megaphone, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useDestinos } from '@/hooks/useContentQueries';
import {
  createDestino, updateDestino, deleteDestino, validarDestino,
  TIPOS_DESTINO, ESTADOS_DESTINO, VISIBILIDADES, slugify,
} from '@/api/destinosApi';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const ICONO_TIPO = { campana: Megaphone, padrinable: Users, institucional: Building2 };

const CLASE_ESTADO = {
  activo: 'bg-green-500/10 text-green-700',
  borrador: 'bg-gray-100 text-gray-500',
  pausado: 'bg-amber-500/10 text-amber-700',
  cerrado: 'bg-brand-primary/10 text-brand-primary',
};

const FORM_VACIO = {
  tipo: 'campana',
  nombre: '',
  slug: '',
  descripcion: '',
  imagen_url: '',
  meta_monto: '',
  cupos_totales: '',
  visibilidad_beneficiario: 'anonimizado',
  estado: 'borrador',
  admite_puntual: true,
  admite_recurrente: false,
  fecha_inicio: '',
  fecha_fin: '',
};

const aFormulario = (d) => ({
  ...FORM_VACIO,
  ...d,
  meta_monto: d.meta_monto ?? '',
  cupos_totales: d.cupos_totales ?? '',
  descripcion: d.descripcion ?? '',
  imagen_url: d.imagen_url ?? '',
  fecha_inicio: d.fecha_inicio ?? '',
  fecha_fin: d.fecha_fin ?? '',
});

/** Convierte el form a payload. Los vacíos van como null, no como '' ni 0. */
const aPayload = (f) => ({
  tipo: f.tipo,
  nombre: f.nombre.trim(),
  slug: (f.slug || slugify(f.nombre)).trim(),
  descripcion: f.descripcion.trim() || null,
  imagen_url: f.imagen_url.trim() || null,
  meta_monto: f.meta_monto === '' ? null : Number(f.meta_monto),
  cupos_totales: f.cupos_totales === '' ? null : Number(f.cupos_totales),
  visibilidad_beneficiario: f.visibilidad_beneficiario,
  estado: f.estado,
  admite_puntual: f.admite_puntual,
  admite_recurrente: f.admite_recurrente,
  fecha_inicio: f.fecha_inicio || null,
  fecha_fin: f.fecha_fin || null,
});

const DestinosAdmin = () => {
  const queryClient = useQueryClient();
  const { data: destinos = [], isPending, error } = useDestinos();
  const { query, setQuery, filtered } = useSearch(destinos, ['nombre', 'slug', 'descripcion']);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);

  const slugPreview = useMemo(
    () => (form.slug || slugify(form.nombre)) || '—',
    [form.slug, form.nombre]
  );

  const invalidar = () => queryClient.invalidateQueries({ queryKey: queryKeys.destinos });

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setErrores({});
    setAbierto(true);
  };

  const abrirEdicion = (d) => {
    setEditando(d);
    setForm(aFormulario(d));
    setErrores({});
    setAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const encontrados = validarDestino(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    const payload = aPayload(form);
    // La capa de datos NO lanza: se mira `error`, no se envuelve en try/catch.
    const { error: fallo } = editando
      ? await updateDestino(editando.id, payload)
      : await createDestino(payload);
    setGuardando(false);

    if (fallo) {
      // 23505 = slug repetido. Es el único choque esperable y merece su mensaje.
      const mensaje = fallo.code === '23505'
        ? 'Ya existe un destino con ese identificador. Cambiá el nombre o editá el slug.'
        : fallo.message;
      toast({ title: 'No se pudo guardar', description: mensaje, variant: 'destructive' });
      return;
    }

    toast({ title: editando ? 'Destino actualizado' : 'Destino creado' });
    setAbierto(false);
    invalidar();
  };

  const borrar = async (d) => {
    setBorrandoId(d.id);
    const { error: fallo } = await deleteDestino(d.id);
    setBorrandoId(null);

    if (fallo) {
      toast({ title: 'No se pudo borrar', description: fallo.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Destino eliminado' });
    invalidar();
  };

  if (isPending) return <ListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar los destinos"
        // TanStack devuelve un Error, no un string: renderizar el objeto rompe la página.
        description={error?.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Target}
        title="Destinos"
        description="A dónde puede ir un aporte: campañas puntuales, padrinazgos y el sostenimiento de la entidad."
        actions={
          <Button onClick={abrirNuevo} variant="action">
            <Plus className="w-4 h-4 mr-2" /> Nuevo destino
          </Button>
        }
      />

      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre o descripción..." />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Target}
          title={query ? 'Sin resultados' : 'Todavía no hay destinos'}
          description={
            query
              ? 'Probá con otra búsqueda.'
              : 'Creá el primero para que quien aporte pueda elegir a dónde va su plata.'
          }
          action={!query && <Button onClick={abrirNuevo} variant="action">Crear destino</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((d) => {
            const Icono = ICONO_TIPO[d.tipo] ?? Target;
            const tieneAportes = (d.cantidad_aportes ?? 0) > 0;
            const progreso = d.meta_monto
              ? Math.min(100, Math.round((Number(d.monto_recaudado) / Number(d.meta_monto)) * 100))
              : null;

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-sm border border-brand-dark/10 bg-white p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Icono className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-dark truncate">{d.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">/{d.slug}</p>
                    </div>
                  </div>
                  <Badge className={`shrink-0 border-none ${CLASE_ESTADO[d.estado] ?? ''}`}>
                    {ESTADOS_DESTINO.find((e) => e.value === d.estado)?.label ?? d.estado}
                  </Badge>
                </div>

                {d.visibilidad_beneficiario === 'publico' && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Muestra al beneficiario públicamente
                  </p>
                )}

                <div className="text-sm text-brand-dark">
                  <span className="font-semibold">
                    ${Number(d.monto_recaudado ?? 0).toLocaleString('es-AR')}
                  </span>
                  <span className="text-gray-500">
                    {' '}· {d.cantidad_aportes ?? 0} {d.cantidad_aportes === 1 ? 'aporte' : 'aportes'}
                    {d.meta_monto ? ` · meta $${Number(d.meta_monto).toLocaleString('es-AR')}` : ''}
                  </span>
                </div>

                {progreso !== null && (
                  <div className="h-1.5 w-full rounded-sm bg-brand-dark/10 overflow-hidden">
                    <div className="h-full bg-brand-gold" style={{ width: `${progreso}%` }} />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => abrirEdicion(d)}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                  </Button>
                  {/* Sin aportes se puede borrar; con aportes la base lo rechaza,
                      así que ni se ofrece: es un libro contable. */}
                  {!tieneAportes && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => borrar(d)}
                      disabled={borrandoId === d.id}
                    >
                      {borrandoId === d.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Borrar</>}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar destino' : 'Nuevo destino'}</DialogTitle>
            <DialogDescription>
              Quien aporte va a poder elegir este destino, y después vas a poder rendir qué se hizo con esa plata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="space-y-4">
            <div>
              <Label className="text-brand-dark font-semibold">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DESTINO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {TIPOS_DESTINO.find((t) => t.value === form.tipo)?.ayuda}
              </p>
            </div>

            <div>
              <Label htmlFor="nombre" className="text-brand-dark font-semibold">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Materiales para la escuelita formativa"
              />
              <p className="text-xs text-gray-500 mt-1">Se va a publicar como <code>/{slugPreview}</code></p>
              {errores.nombre && <p className="text-sm text-red-600">{errores.nombre}</p>}
            </div>

            <div>
              <Label htmlFor="descripcion" className="text-brand-dark font-semibold">Descripción</Label>
              <Textarea
                id="descripcion"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Qué se va a comprar o financiar, y para quiénes."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meta" className="text-brand-dark font-semibold">Meta ($)</Label>
                <Input
                  id="meta" type="number" min="1" value={form.meta_monto}
                  onChange={(e) => setForm({ ...form, meta_monto: e.target.value })}
                  placeholder="Opcional"
                />
                {errores.meta_monto && <p className="text-sm text-red-600">{errores.meta_monto}</p>}
              </div>
              <div>
                <Label htmlFor="cupos" className="text-brand-dark font-semibold">Cupos</Label>
                <Input
                  id="cupos" type="number" min="1" value={form.cupos_totales}
                  onChange={(e) => setForm({ ...form, cupos_totales: e.target.value })}
                  placeholder="Opcional"
                />
                {errores.cupos_totales && <p className="text-sm text-red-600">{errores.cupos_totales}</p>}
              </div>
            </div>

            <fieldset className="rounded-sm border border-brand-dark/10 p-4">
              <legend className="px-2 text-sm font-semibold text-brand-dark">Formas de aporte</legend>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox" checked={form.admite_puntual}
                    onChange={(e) => setForm({ ...form, admite_puntual: e.target.checked })}
                  />
                  Aporte puntual
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox" checked={form.admite_recurrente}
                    onChange={(e) => setForm({ ...form, admite_recurrente: e.target.checked })}
                  />
                  Aporte mensual
                </label>
              </div>
              {errores.admite && <p className="text-sm text-red-600 mt-2">{errores.admite}</p>}
            </fieldset>

            {/* Bloque deliberadamente visible y no plegado: es la decisión con
                consecuencias sobre personas reales. Ver §10.8 y §10.9. */}
            <fieldset className="rounded-sm border border-amber-300 bg-amber-50/50 p-4">
              <legend className="px-2 text-sm font-semibold text-amber-800">Visibilidad del beneficiario</legend>
              <Select
                value={form.visibilidad_beneficiario}
                onValueChange={(v) => setForm({ ...form, visibilidad_beneficiario: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIBILIDADES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-800 mt-2">
                {VISIBILIDADES.find((v) => v.value === form.visibilidad_beneficiario)?.ayuda}
              </p>
              {form.visibilidad_beneficiario === 'publico' && (
                <p className="flex items-start gap-1.5 text-xs font-semibold text-red-700 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Nunca publiques datos de menores: ni nombre, ni foto, ni información de salud.
                </p>
              )}
            </fieldset>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio" className="text-brand-dark font-semibold">Inicio</Label>
                <Input
                  id="inicio" type="date" value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fin" className="text-brand-dark font-semibold">Cierre</Label>
                <Input
                  id="fin" type="date" value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                />
                {errores.fecha_fin && <p className="text-sm text-red-600">{errores.fecha_fin}</p>}
              </div>
            </div>

            <div>
              <Label className="text-brand-dark font-semibold">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_DESTINO.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {ESTADOS_DESTINO.find((e) => e.value === form.estado)?.ayuda}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
              <Button type="submit" variant="action" disabled={guardando}>
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DestinosAdmin;
