// src/components/Club/ClubAdmin.jsx
//
// ABM del club de beneficios (ROADMAP §12). Es la pantalla que faltaba para que
// dar de alta un comercio no necesite un desarrollador — que era el hueco entre
// lo que §12.7 promete (copiar el módulo a otro proyecto y que funcione) y lo
// que §12.8 puso en las fases.
//
// Vive en `src/components/Club/` y no en `src/components/Admin/` a propósito
// (§12.7 regla 6): así la carpeta del club viaja completa, con su mostrador, su
// catálogo y su administración. El único punto de integración con el proyecto
// anfitrión es una línea en `AdminPanel.jsx`.
//
// UNA DECISIÓN QUE SE VE EN LA PANTALLA: no hay botón de borrar comercio. Un
// comercio con canjes no se puede borrar (FK RESTRICT) y aunque se pudiera,
// borrarlo dejaría al club y al comercio con números distintos. Se archiva con
// estado «De baja» (12.9.3).
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Store, Edit, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';

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
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';
import ComercioDetalle from '@/components/Club/ComercioDetalle';
import {
  ESTADOS_COMERCIO, listComercios, createComercio, updateComercio,
  listPartnersAprobados, validarComercio, slugify,
} from '@/api/clubAdminApi';

const SIN_PARTNER = '__ninguno__';

const VACIO = {
  nombre: '', slug: '', rubro: '', cuit: '', descripcion: '', logo_url: '',
  partner_id: SIN_PARTNER, estado: 'pendiente',
};

const COLOR_ESTADO = {
  activo: 'bg-green-100 text-green-800',
  pendiente: 'bg-amber-100 text-amber-800',
  pausado: 'bg-slate-100 text-slate-700',
  baja: 'bg-red-100 text-red-800',
};

const ClubAdmin = () => {
  const [comercios, setComercios] = useState(null);
  const [partners, setPartners] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const { data, error } = await listComercios();
    if (error) toast({ title: 'No pudimos cargar los comercios', variant: 'destructive' });
    setComercios(data ?? []);
  };

  useEffect(() => {
    cargar();
    listPartnersAprobados().then(({ data }) => setPartners(data ?? []));
  }, []);

  const { query, setQuery, filtered } = useSearch(comercios ?? [], ['nombre', 'rubro', 'slug']);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(VACIO);
    setErrores({});
    setAbierto(true);
  };

  const abrirEditar = (c) => {
    setEditando(c);
    setForm({
      nombre: c.nombre ?? '', slug: c.slug ?? '', rubro: c.rubro ?? '', cuit: c.cuit ?? '',
      descripcion: c.descripcion ?? '', logo_url: c.logo_url ?? '',
      partner_id: c.partner_id ?? SIN_PARTNER, estado: c.estado ?? 'pendiente',
    });
    setErrores({});
    setAbierto(true);
  };

  const guardar = async () => {
    const e = validarComercio(form);
    setErrores(e);
    if (Object.keys(e).length) return;

    setGuardando(true);
    const payload = {
      nombre: form.nombre.trim(),
      slug: form.slug.trim(),
      rubro: form.rubro.trim() || null,
      cuit: form.cuit.trim() || null,
      descripcion: form.descripcion.trim() || null,
      logo_url: form.logo_url.trim() || null,
      partner_id: form.partner_id === SIN_PARTNER ? null : form.partner_id,
      estado: form.estado,
    };
    const { error } = editando
      ? await updateComercio(editando.id, payload)
      : await createComercio(payload);
    setGuardando(false);

    if (error) {
      // El caso más frecuente es el slug repetido (UNIQUE en la tabla).
      const repetido = /duplicate key|already exists|unique/i.test(error.message || '');
      if (repetido) {
        setErrores({ slug: 'Ya existe un comercio con ese slug.' });
        return;
      }
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editando ? 'Comercio actualizado' : 'Comercio creado' });
    setAbierto(false);
    cargar();
  };

  const partnerElegido = useMemo(
    () => partners.find((p) => p.id === form.partner_id),
    [partners, form.partner_id],
  );

  /* ---------------- Detalle de un comercio ---------------- */
  if (seleccionado) {
    return (
      <div>
        <button
          type="button"
          onClick={() => { setSeleccionado(null); cargar(); }}
          className="mb-4 flex items-center gap-2 text-sm text-brand-dark/70 hover:text-brand-dark"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a los comercios
        </button>
        <ComercioDetalle comercio={seleccionado} />
      </div>
    );
  }

  /* ---------------- Listado ---------------- */
  return (
    <div>
      <SectionHeader
        title="Club de beneficios"
        description="Los comercios adheridos, sus sucursales, sus beneficios y quién valida en el mostrador."
        actions={
          <Button variant="action" onClick={abrirNuevo}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Nuevo comercio
          </Button>
        }
      />

      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre, rubro o slug…" />

      {comercios === null ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title={comercios.length === 0 ? 'Todavía no hay comercios' : 'Ningún comercio coincide'}
          description={
            comercios.length === 0
              ? 'Cargá el primero. Después le agregás sucursales, beneficios y quién valida los canjes.'
              : 'Probá con otro texto.'
          }
        />
      ) : (
        <ul className="divide-y divide-brand-dark/10 border-t border-brand-dark/10">
          {filtered.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-brand-dark">{c.nombre}</p>
                  <Badge className={COLOR_ESTADO[c.estado] ?? ''}>
                    {ESTADOS_COMERCIO.find((e) => e.value === c.estado)?.label ?? c.estado}
                  </Badge>
                </div>
                <p className="text-xs text-brand-dark/60">
                  {c.rubro ? `${c.rubro} · ` : ''}/{c.slug}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirEditar(c)}>
                  <Edit aria-hidden="true" className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button variant="action" size="sm" onClick={() => setSeleccionado(c)}>
                  Gestionar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---------------- Alta / edición ---------------- */}
      <Dialog open={abierto} onOpenChange={(o) => { if (!guardando) setAbierto(o); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar comercio' : 'Nuevo comercio'}</DialogTitle>
            <DialogDescription>
              Un comercio del club es distinto de un partner institucional: el partner es un
              logo en la Home, el comercio es una contraparte del mostrador. Pueden ser la
              misma empresa, y para eso está el campo de abajo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="c-nombre" className="text-brand-dark font-semibold">Nombre *</Label>
              <Input
                id="c-nombre"
                value={form.nombre}
                onChange={(ev) => {
                  const nombre = ev.target.value;
                  // El slug se propone desde el nombre solo mientras sea nuevo:
                  // cambiarlo después rompe los links que ya se compartieron.
                  setForm((f) => ({
                    ...f,
                    nombre,
                    slug: editando ? f.slug : slugify(nombre),
                  }));
                }}
                className="mt-1"
              />
              {errores.nombre && <p className="mt-1 text-sm text-red-600">{errores.nombre}</p>}
            </div>

            <div>
              <Label htmlFor="c-slug" className="text-brand-dark font-semibold">Slug *</Label>
              <Input
                id="c-slug"
                value={form.slug}
                onChange={(ev) => setForm((f) => ({ ...f, slug: ev.target.value }))}
                className="mt-1 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-brand-dark/60">
                Solo minúsculas, números y guiones. Es parte de la URL, así que conviene no
                cambiarlo una vez publicado.
              </p>
              {errores.slug && <p className="mt-1 text-sm text-red-600">{errores.slug}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-rubro" className="text-brand-dark font-semibold">Rubro</Label>
                <Input
                  id="c-rubro"
                  value={form.rubro}
                  onChange={(ev) => setForm((f) => ({ ...f, rubro: ev.target.value }))}
                  className="mt-1"
                  placeholder="Gastronomía, Tecnología…"
                />
              </div>
              <div>
                <Label htmlFor="c-cuit" className="text-brand-dark font-semibold">CUIT</Label>
                <Input
                  id="c-cuit"
                  value={form.cuit}
                  onChange={(ev) => setForm((f) => ({ ...f, cuit: ev.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="c-desc" className="text-brand-dark font-semibold">Descripción</Label>
              <Textarea
                id="c-desc"
                value={form.descripcion}
                onChange={(ev) => setForm((f) => ({ ...f, descripcion: ev.target.value }))}
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-brand-dark font-semibold">Partner institucional (opcional)</Label>
              <Select
                value={form.partner_id}
                onValueChange={(v) => setForm((f) => ({ ...f, partner_id: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_PARTNER}>Ninguno</SelectItem>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-brand-dark/60">
                {partnerElegido
                  ? `Se va a poder reusar el logo y los datos de ${partnerElegido.nombre}.`
                  : 'Si el comercio ya es partner de la Fundación, elegilo y no hace falta duplicar datos.'}
              </p>
            </div>

            <div>
              <Label htmlFor="c-logo" className="text-brand-dark font-semibold">Logo (URL)</Label>
              <Input
                id="c-logo"
                value={form.logo_url}
                onChange={(ev) => setForm((f) => ({ ...f, logo_url: ev.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-brand-dark font-semibold">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_COMERCIO.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-brand-dark/60">
                {ESTADOS_COMERCIO.find((e) => e.value === form.estado)?.ayuda}
              </p>
            </div>

            {form.estado === 'baja' && (
              <p className="flex items-start gap-2 rounded-sm border border-brand-gold/40 bg-brand-gold/5 p-3 text-xs text-brand-dark">
                <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                Dar de baja archiva la ficha y saca los beneficios del catálogo.
                <strong className="font-semibold">Los canjes no se borran nunca</strong>: son el
                libro contable del club.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="action" onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
              {editando ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubAdmin;
