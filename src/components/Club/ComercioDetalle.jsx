// src/components/Club/ComercioDetalle.jsx
//
// Todo lo que cuelga de un comercio: sucursales, beneficios y quién valida en el
// mostrador (ROADMAP §12.3).
//
// LA PARTE QUE MÁS IMPORTA ES «QUIÉN VALIDA», y es la menos obvia: NO se crea un
// usuario «de tipo comercio», porque ese rol no existe. Se busca una cuenta que
// ya existe en el sitio y se la ata a este comercio (§12.5). Esa fila es lo que
// le abre `/comercio`. Se hizo así para que una persona pueda operar dos
// comercios sin romper el modelo de roles de `users`.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus, MapPin, Ticket, Users, Trash2, Edit, Loader2, Search, Lock, Unlock, Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { etiquetaBeneficio } from '@/lib/club';
import {
  DIAS_SEMANA, ESTADOS_BENEFICIO, TIPOS_BENEFICIO, VENTANAS, ROLES_COMERCIO,
  listSucursales, createSucursal, updateSucursal, deleteSucursal,
  listBeneficiosDeComercio, createBeneficio, updateBeneficio,
  listOperadores, addOperador, removeOperador, buscarUsuarios,
  validarBeneficio, beneficioAPayload,
} from '@/api/clubAdminApi';

const SUCURSAL_VACIA = { nombre: '', direccion: '', telefono: '', activa: true };

const BENEFICIO_VACIO = {
  titulo: '', descripcion: '', terminos: '', tipo: 'porcentaje', valor: '',
  requiere_acceso: true, limite_por_persona: '', ventana: '', limite_total: '', stock: '',
  vigencia_desde: '', vigencia_hasta: '', dias_semana: [], hora_desde: '', hora_hasta: '',
  estado: 'borrador', orden: 0,
  slug: '', instrucciones: '', imagen_url: '',
  antiguedad_minima_meses: '', aporte_minimo_acumulado: '', ahorro_maximo: '',
};

const SIN_VENTANA = '__sin__';

const Titulo = ({ icon: Icon, children, action }) => (
  <div className="mt-10 flex items-center justify-between border-b border-brand-dark/10 pb-2">
    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark/70">
      <Icon aria-hidden="true" className="h-4 w-4" />
      {children}
    </h3>
    {action}
  </div>
);

const ComercioDetalle = ({ comercio }) => {
  const [sucursales, setSucursales] = useState([]);
  const [beneficios, setBeneficios] = useState([]);
  const [operadores, setOperadores] = useState([]);

  const recargar = useCallback(async () => {
    const [s, b, o] = await Promise.all([
      listSucursales(comercio.id),
      listBeneficiosDeComercio(comercio.id),
      listOperadores(comercio.id),
    ]);
    setSucursales(s.data ?? []);
    setBeneficios(b.data ?? []);
    setOperadores(o.data ?? []);
  }, [comercio.id]);

  useEffect(() => { recargar(); }, [recargar]);

  /* ============ Sucursales ============ */
  const [sucAbierta, setSucAbierta] = useState(false);
  const [sucEditando, setSucEditando] = useState(null);
  const [sucForm, setSucForm] = useState(SUCURSAL_VACIA);
  const [sucError, setSucError] = useState('');

  const guardarSucursal = async () => {
    if (!sucForm.nombre.trim()) { setSucError('Poné un nombre.'); return; }
    const payload = {
      comercio_id: comercio.id,
      nombre: sucForm.nombre.trim(),
      direccion: sucForm.direccion.trim() || null,
      telefono: sucForm.telefono.trim() || null,
      activa: sucForm.activa,
    };
    const { error } = sucEditando
      ? await updateSucursal(sucEditando.id, payload)
      : await createSucursal(payload);
    if (error) { toast({ title: 'No se pudo guardar', variant: 'destructive' }); return; }
    toast({ title: sucEditando ? 'Sucursal actualizada' : 'Sucursal creada' });
    setSucAbierta(false);
    recargar();
  };

  const borrarSucursal = async (s) => {
    const { error } = await deleteSucursal(s.id);
    if (error) {
      toast({ title: 'No se pudo borrar', description: 'Puede tener canjes asociados.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Sucursal borrada' });
    recargar();
  };

  /* ============ Beneficios ============ */
  const [benAbierto, setBenAbierto] = useState(false);
  const [benEditando, setBenEditando] = useState(null);
  const [benForm, setBenForm] = useState(BENEFICIO_VACIO);
  const [benErrores, setBenErrores] = useState({});
  const [benGuardando, setBenGuardando] = useState(false);

  const abrirBeneficio = (b) => {
    setBenEditando(b ?? null);
    setBenForm(
      b
        ? {
            titulo: b.titulo ?? '', descripcion: b.descripcion ?? '', terminos: b.terminos ?? '',
            tipo: b.tipo ?? 'porcentaje', valor: b.valor ?? '',
            requiere_acceso: b.requiere_acceso ?? true,
            limite_por_persona: b.limite_por_persona ?? '', ventana: b.ventana ?? '',
            limite_total: b.limite_total ?? '', stock: b.stock ?? '',
            vigencia_desde: b.vigencia_desde ?? '', vigencia_hasta: b.vigencia_hasta ?? '',
            dias_semana: b.dias_semana ?? [], hora_desde: b.hora_desde ?? '', hora_hasta: b.hora_hasta ?? '',
            estado: b.estado ?? 'borrador', orden: b.orden ?? 0,
            slug: b.slug ?? '', instrucciones: b.instrucciones ?? '',
            imagen_url: b.imagen_url ?? '',
            antiguedad_minima_meses: b.antiguedad_minima_meses ?? '',
            aporte_minimo_acumulado: b.aporte_minimo_acumulado ?? '',
            ahorro_maximo: b.ahorro_maximo ?? '',
          }
        : BENEFICIO_VACIO,
    );
    setBenErrores({});
    setBenAbierto(true);
  };

  const guardarBeneficio = async () => {
    const e = validarBeneficio(benForm);
    setBenErrores(e);
    if (Object.keys(e).length) return;

    setBenGuardando(true);
    const payload = beneficioAPayload({ ...benForm, comercio_id: comercio.id });
    const { error } = benEditando
      ? await updateBeneficio(benEditando.id, payload)
      : await createBeneficio(payload);
    setBenGuardando(false);

    if (error) { toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: benEditando ? 'Beneficio actualizado' : 'Beneficio creado' });
    setBenAbierto(false);
    recargar();
  };

  const necesitaValor = benForm.tipo === 'porcentaje' || benForm.tipo === 'monto_fijo';

  /* ============ Operadores ============ */
  const [opAbierto, setOpAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState([]);
  const [rolNuevo, setRolNuevo] = useState('cajero');

  useEffect(() => {
    if (!opAbierto) return undefined;
    const t = setTimeout(async () => {
      const { data } = await buscarUsuarios(busqueda);
      setCandidatos(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, opAbierto]);

  const atarOperador = async (u) => {
    const { error } = await addOperador({ comercioId: comercio.id, userId: u.id, rol: rolNuevo });
    if (error) {
      const repetido = /duplicate|unique/i.test(error.message || '');
      toast({
        title: repetido ? 'Esa cuenta ya opera este comercio' : 'No se pudo agregar',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Operador agregado', description: `${u.name || u.email} ya puede validar canjes.` });
    setOpAbierto(false);
    setBusqueda('');
    recargar();
  };

  const quitarOperador = async (o) => {
    const { error } = await removeOperador(comercio.id, o.user_id);
    if (error) { toast({ title: 'No se pudo quitar', variant: 'destructive' }); return; }
    toast({ title: 'Operador quitado' });
    recargar();
  };

  /* ============ Render ============ */
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-display font-bold text-brand-dark break-words">{comercio.nombre}</h2>
        <Badge>{comercio.estado}</Badge>
      </div>
      <p className="mt-1 text-sm text-brand-dark/60">
        {comercio.rubro ? `${comercio.rubro} · ` : ''}/{comercio.slug}
      </p>

      {/* ---------- Sucursales ---------- */}
      <Titulo
        icon={MapPin}
        action={
          <Button
            variant="outline" size="sm"
            onClick={() => { setSucEditando(null); setSucForm(SUCURSAL_VACIA); setSucError(''); setSucAbierta(true); }}
          >
            <Plus aria-hidden="true" className="mr-1 h-3 w-3" /> Agregar
          </Button>
        }
      >
        Sucursales
      </Titulo>

      {sucursales.length === 0 ? (
        <p className="py-4 text-sm text-brand-dark/60">
          Sin sucursales. Si el comercio es online, alcanza con una llamada «Online».
        </p>
      ) : (
        <ul className="divide-y divide-brand-dark/10">
          {sucursales.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-dark">
                  {s.nombre} {!s.activa && <span className="text-xs text-brand-dark/50">(inactiva)</span>}
                </p>
                {s.direccion && <p className="text-xs text-brand-dark/60">{s.direccion}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    setSucEditando(s);
                    setSucForm({
                      nombre: s.nombre ?? '', direccion: s.direccion ?? '',
                      telefono: s.telefono ?? '', activa: s.activa,
                    });
                    setSucError('');
                    setSucAbierta(true);
                  }}
                >
                  <Edit aria-hidden="true" className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => borrarSucursal(s)}>
                  <Trash2 aria-hidden="true" className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Beneficios ---------- */}
      <Titulo
        icon={Ticket}
        action={
          <Button variant="outline" size="sm" onClick={() => abrirBeneficio(null)}>
            <Plus aria-hidden="true" className="mr-1 h-3 w-3" /> Agregar
          </Button>
        }
      >
        Beneficios
      </Titulo>

      {beneficios.length === 0 ? (
        <p className="py-4 text-sm text-brand-dark/60">
          Sin beneficios. Nacen en «borrador»: se redactan con el comercio y recién después se publican.
        </p>
      ) : (
        <ul className="divide-y divide-brand-dark/10">
          {beneficios.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-brand-dark">{b.titulo}</p>
                  <Badge>{ESTADOS_BENEFICIO.find((e) => e.value === b.estado)?.label ?? b.estado}</Badge>
                  {b.requiere_acceso ? (
                    <span className="flex items-center gap-1 text-xs text-brand-dark/60">
                      <Lock aria-hidden="true" className="h-3 w-3" /> Solo socios
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-brand-dark/60">
                      <Unlock aria-hidden="true" className="h-3 w-3" /> Abierto
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-dark/60">
                  {etiquetaBeneficio(b) ?? b.tipo}
                  {b.limite_por_persona
                    ? ` · ${b.limite_por_persona} por ${VENTANAS.find((v) => v.value === b.ventana)?.label?.toLowerCase() ?? b.ventana}`
                    : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => abrirBeneficio(b)}>
                <Edit aria-hidden="true" className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Operadores ---------- */}
      <Titulo
        icon={Users}
        action={
          <Button variant="outline" size="sm" onClick={() => { setBusqueda(''); setCandidatos([]); setOpAbierto(true); }}>
            <Plus aria-hidden="true" className="mr-1 h-3 w-3" /> Agregar
          </Button>
        }
      >
        Quién valida en el mostrador
      </Titulo>

      <p className="flex items-start gap-2 py-3 text-xs text-brand-dark/60">
        <Info aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
        No se crea un usuario «de comercio»: ese rol no existe. Se busca una cuenta que ya
        exista en el sitio y se la ata acá. Esa fila es lo que le abre <code>/comercio</code>.
      </p>

      {operadores.length === 0 ? (
        <p className="pb-4 text-sm text-brand-dark/60">
          Nadie puede validar canjes de este comercio todavía.
        </p>
      ) : (
        <ul className="divide-y divide-brand-dark/10">
          {operadores.map((o) => (
            <li key={o.user_id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-dark">{o.users?.name || '(sin nombre)'}</p>
                <p className="text-xs text-brand-dark/60">
                  {o.users?.email} · {ROLES_COMERCIO.find((r) => r.value === o.rol)?.label ?? o.rol}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => quitarOperador(o)}>
                <Trash2 aria-hidden="true" className="h-3 w-3 text-red-600" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* ================= Dialogs ================= */}

      {/* --- Sucursal --- */}
      <Dialog open={sucAbierta} onOpenChange={setSucAbierta}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sucEditando ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="s-nombre" className="text-brand-dark font-semibold">Nombre *</Label>
              <Input
                id="s-nombre" value={sucForm.nombre} className="mt-1"
                onChange={(e) => setSucForm((f) => ({ ...f, nombre: e.target.value }))}
              />
              {sucError && <p className="mt-1 text-sm text-red-600">{sucError}</p>}
            </div>
            <div>
              <Label htmlFor="s-dir" className="text-brand-dark font-semibold">Dirección</Label>
              <Input
                id="s-dir" value={sucForm.direccion} className="mt-1"
                onChange={(e) => setSucForm((f) => ({ ...f, direccion: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="s-tel" className="text-brand-dark font-semibold">Teléfono</Label>
              <Input
                id="s-tel" value={sucForm.telefono} className="mt-1"
                onChange={(e) => setSucForm((f) => ({ ...f, telefono: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-dark">
              <Checkbox
                checked={sucForm.activa}
                onCheckedChange={(v) => setSucForm((f) => ({ ...f, activa: Boolean(v) }))}
              />
              Activa
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSucAbierta(false)}>Cancelar</Button>
            <Button variant="action" onClick={guardarSucursal}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Beneficio --- */}
      <Dialog open={benAbierto} onOpenChange={(o) => { if (!benGuardando) setBenAbierto(o); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{benEditando ? 'Editar beneficio' : 'Nuevo beneficio'}</DialogTitle>
            <DialogDescription>
              Los términos son lo que el socio lee antes de generar el código. Es donde se
              evitan los conflictos de mostrador: escribilos con el comercio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="b-titulo" className="text-brand-dark font-semibold">Título *</Label>
              <Input
                id="b-titulo" value={benForm.titulo} className="mt-1"
                onChange={(e) => setBenForm((f) => ({ ...f, titulo: e.target.value }))}
              />
              {benErrores.titulo && <p className="mt-1 text-sm text-red-600">{benErrores.titulo}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-brand-dark font-semibold">Tipo *</Label>
                <Select value={benForm.tipo} onValueChange={(v) => setBenForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_BENEFICIO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-brand-dark/60">
                  {TIPOS_BENEFICIO.find((t) => t.value === benForm.tipo)?.ayuda}
                </p>
              </div>
              <div>
                <Label htmlFor="b-valor" className="text-brand-dark font-semibold">
                  Valor {necesitaValor ? '*' : <span className="font-normal text-brand-dark/50">(no aplica)</span>}
                </Label>
                <Input
                  id="b-valor" type="number" min="0" className="mt-1"
                  value={benForm.valor} disabled={!necesitaValor}
                  onChange={(e) => setBenForm((f) => ({ ...f, valor: e.target.value }))}
                />
                {benErrores.valor && <p className="mt-1 text-sm text-red-600">{benErrores.valor}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="b-desc" className="text-brand-dark font-semibold">Descripción</Label>
              <Textarea
                id="b-desc" rows={2} className="mt-1" value={benForm.descripcion}
                onChange={(e) => setBenForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="b-term" className="text-brand-dark font-semibold">Términos</Label>
              <Textarea
                id="b-term" rows={4} className="mt-1" value={benForm.terminos}
                onChange={(e) => setBenForm((f) => ({ ...f, terminos: e.target.value }))}
                placeholder="¿Incluye promociones? ¿Aplica sobre presupuestos ya aprobados? ¿Es acumulable?"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-brand-dark">
              <Checkbox
                className="mt-0.5"
                checked={benForm.requiere_acceso}
                onCheckedChange={(v) => setBenForm((f) => ({ ...f, requiere_acceso: Boolean(v) }))}
              />
              <span>
                Solo para socios con aporte vigente
                <span className="block text-xs text-brand-dark/60">
                  Si lo destildás, cualquiera puede canjearlo. Útil para probar el circuito.
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="b-lim" className="text-brand-dark font-semibold">Veces por persona</Label>
                <Input
                  id="b-lim" type="number" min="1" className="mt-1" value={benForm.limite_por_persona}
                  onChange={(e) => setBenForm((f) => ({ ...f, limite_por_persona: e.target.value }))}
                />
                {benErrores.limite_por_persona && (
                  <p className="mt-1 text-sm text-red-600">{benErrores.limite_por_persona}</p>
                )}
              </div>
              <div>
                <Label className="text-brand-dark font-semibold">Cada cuánto</Label>
                <Select
                  value={benForm.ventana || SIN_VENTANA}
                  onValueChange={(v) => setBenForm((f) => ({ ...f, ventana: v === SIN_VENTANA ? '' : v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VENTANA}>Sin límite</SelectItem>
                    {VENTANAS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {benErrores.ventana && <p className="mt-1 text-sm text-red-600">{benErrores.ventana}</p>}
              </div>
            </div>

            {/* --- La vidriera pública (§12.10.15) --- */}
            <div className="rounded-sm border border-brand-dark/10 bg-brand-sand/40 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-dark/60">
                Cómo se ve en el catálogo público
              </p>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="b-slug" className="text-brand-dark font-semibold">
                    URL del beneficio
                  </Label>
                  <Input
                    id="b-slug" className="mt-1" placeholder="30-de-descuento-en-sitios-web"
                    value={benForm.slug}
                    onChange={(e) => setBenForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Queda como /beneficios/&lt;esto&gt;. Si ya se compartió, no la cambies.
                  </p>
                  {benErrores.slug && <p className="mt-1 text-sm text-red-600">{benErrores.slug}</p>}
                </div>
                <div>
                  <Label htmlFor="b-instr" className="text-brand-dark font-semibold">
                    Instrucciones
                  </Label>
                  <Textarea
                    id="b-instr" className="mt-1" rows={3}
                    placeholder="Generá tu código desde el club y presentalo al contratar."
                    value={benForm.instrucciones}
                    onChange={(e) => setBenForm((f) => ({ ...f, instrucciones: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ Nunca pongas un código acá: esta página la ve cualquiera sin sesión.
                  </p>
                  {benErrores.instrucciones && (
                    <p className="mt-1 text-sm text-red-600">{benErrores.instrucciones}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="b-img" className="text-brand-dark font-semibold">
                    Imagen (opcional)
                  </Label>
                  <Input
                    id="b-img" className="mt-1" placeholder="https://..."
                    value={benForm.imagen_url}
                    onChange={(e) => setBenForm((f) => ({ ...f, imagen_url: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Si la dejás vacía se usa el logo del comercio.
                  </p>
                </div>
              </div>
            </div>

            {/* --- Requisitos: que el umbral sea proporcional al valor (§12.11) --- */}
            <div className="rounded-sm border border-brand-dark/10 bg-brand-sand/40 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-dark/60">
                Requisitos para canjearlo
              </p>
              <p className="mb-3 text-xs text-gray-600">
                Para un beneficio caro, el acceso vigente no alcanza: con una cuota
                simbólica, un solo aporte desbloquearía un descuento de decenas de miles.
                Se cumple con la antigüedad <strong>o</strong> con el aporte acumulado.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="b-antig" className="text-brand-dark font-semibold">Meses aportados</Label>
                  <Input
                    id="b-antig" type="number" min="0" className="mt-1" value={benForm.antiguedad_minima_meses}
                    onChange={(e) => setBenForm((f) => ({ ...f, antiguedad_minima_meses: e.target.value }))}
                  />
                  {benErrores.antiguedad_minima_meses && (
                    <p className="mt-1 text-sm text-red-600">{benErrores.antiguedad_minima_meses}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="b-apmin" className="text-brand-dark font-semibold">O aporte acumulado</Label>
                  <Input
                    id="b-apmin" type="number" min="0" className="mt-1" value={benForm.aporte_minimo_acumulado}
                    onChange={(e) => setBenForm((f) => ({ ...f, aporte_minimo_acumulado: e.target.value }))}
                  />
                  {benErrores.aporte_minimo_acumulado && (
                    <p className="mt-1 text-sm text-red-600">{benErrores.aporte_minimo_acumulado}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="b-tope" className="text-brand-dark font-semibold">Tope de ahorro</Label>
                  <Input
                    id="b-tope" type="number" min="1" className="mt-1" value={benForm.ahorro_maximo}
                    onChange={(e) => setBenForm((f) => ({ ...f, ahorro_maximo: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-gray-500">Lo que como máximo pone el comercio.</p>
                  {benErrores.ahorro_maximo && (
                    <p className="mt-1 text-sm text-red-600">{benErrores.ahorro_maximo}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="b-desde" className="text-brand-dark font-semibold">Vigente desde</Label>
                <Input
                  id="b-desde" type="date" className="mt-1" value={benForm.vigencia_desde}
                  onChange={(e) => setBenForm((f) => ({ ...f, vigencia_desde: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="b-hasta" className="text-brand-dark font-semibold">Vigente hasta</Label>
                <Input
                  id="b-hasta" type="date" className="mt-1" value={benForm.vigencia_hasta}
                  onChange={(e) => setBenForm((f) => ({ ...f, vigencia_hasta: e.target.value }))}
                />
                {benErrores.vigencia_hasta && (
                  <p className="mt-1 text-sm text-red-600">{benErrores.vigencia_hasta}</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-brand-dark font-semibold">Días en que se puede usar</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {DIAS_SEMANA.map((d) => (
                  <label key={d.value} className="flex items-center gap-1 text-sm text-brand-dark">
                    <Checkbox
                      checked={benForm.dias_semana.includes(d.value)}
                      onCheckedChange={(v) =>
                        setBenForm((f) => ({
                          ...f,
                          dias_semana: v
                            ? [...f.dias_semana, d.value].sort((a, b) => a - b)
                            : f.dias_semana.filter((x) => x !== d.value),
                        }))
                      }
                    />
                    {d.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-brand-dark/60">Sin marcar nada, vale todos los días.</p>
            </div>

            <div>
              <Label className="text-brand-dark font-semibold">Estado</Label>
              <Select value={benForm.estado} onValueChange={(v) => setBenForm((f) => ({ ...f, estado: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BENEFICIO.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-brand-dark/60">
                {ESTADOS_BENEFICIO.find((e) => e.value === benForm.estado)?.ayuda}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBenAbierto(false)} disabled={benGuardando}>
              Cancelar
            </Button>
            <Button variant="action" onClick={guardarBeneficio} disabled={benGuardando}>
              {benGuardando && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Operador --- */}
      <Dialog open={opAbierto} onOpenChange={setOpAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar quien valida</DialogTitle>
            <DialogDescription>
              Buscá una cuenta que ya exista en el sitio. Si la persona todavía no tiene,
              creala primero en Usuarios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-brand-dark font-semibold">Rol</Label>
              <Select value={rolNuevo} onValueChange={setRolNuevo}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES_COMERCIO.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-brand-dark/60">
                {ROLES_COMERCIO.find((r) => r.value === rolNuevo)?.ayuda}
              </p>
            </div>

            <div>
              <Label htmlFor="op-q" className="text-brand-dark font-semibold">Buscar cuenta</Label>
              <div className="relative mt-1">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/40" />
                <Input
                  id="op-q" className="pl-9" value={busqueda} placeholder="Nombre o email…"
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              {busqueda.trim().length > 0 && busqueda.trim().length < 3 && (
                <p className="mt-1 text-xs text-brand-dark/60">Escribí al menos 3 caracteres.</p>
              )}
            </div>

            <ul className="max-h-56 divide-y divide-brand-dark/10 overflow-y-auto">
              {candidatos.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-brand-dark">{u.name || '(sin nombre)'}</p>
                    <p className="truncate text-xs text-brand-dark/60">{u.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => atarOperador(u)}>Agregar</Button>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComercioDetalle;
