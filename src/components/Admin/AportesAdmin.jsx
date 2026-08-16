// src/components/Admin/AportesAdmin.jsx
//
// El libro único: todo lo que entró y a qué destino fue (ROADMAP §10.7, §10.11).
//
// Tres decisiones de esta pantalla que no son cosméticas:
//
//  1. **No hay botón de borrar, en ninguna fila.** `aportes` no tiene policy de
//     DELETE: un libro contable no se borra. Un aporte mal cargado se corrige y
//     queda el rastro. Ofrecer un botón que la base va a rechazar sería invitar
//     a una acción imposible.
//
//  2. **Un aporte manual se corrige entero; uno de pasarela, solo en su
//     destino.** Monto y fecha de una pasarela son el registro de esa pasarela,
//     y tocarlos a mano haría que el libro diverja de lo que MercadoPago dice
//     que pasó (§10.10). **El destino, en cambio, MercadoPago ni lo conoce**:
//     es una decisión de la entidad, así que re-imputarlo no contradice a nadie.
//     Y hace falta de verdad — hasta que el servicio de pagos reenvíe el destino
//     elegido, toda donación digital cae al institucional (§10.13).
//
//  3. **La carga manual no es un parche.** Una entidad recibe efectivo,
//     transferencias y cheques, y esa plata tiene que entrar al mismo libro que
//     la digital o la rendición no cuadra. Hoy es además el único circuito que
//     cierra de punta a punta, sin depender de ninguna pasarela.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Edit, Loader2, AlertTriangle, Wallet, Target } from 'lucide-react';
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
import { useAportes, useDestinos } from '@/hooks/useContentQueries';
import {
  createAporteManual, updateAporte, reimputarAporte,
  validarAporte, aPayloadAporte, describirOrigen, hoyISO,
} from '@/api/aportesApi';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const CLASE_ORIGEN = {
  manual: 'bg-brand-gold/20 text-brand-dark',
  donacion: 'bg-green-500/10 text-green-700',
  membresia: 'bg-brand-primary/10 text-brand-primary',
};

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

/** `fecha` es timestamptz; para mostrar alcanza el día. */
const soloFecha = (valor) => (valor ? String(valor).slice(0, 10) : '—');

const formVacio = () => ({
  destino_id: '',
  monto: '',
  fecha: hoyISO(),
  nombre_aportante: '',
  email_aportante: '',
  notas: '',
});

const aFormulario = (a) => ({
  destino_id: a.destino_id ?? '',
  monto: a.monto ?? '',
  fecha: soloFecha(a.fecha),
  nombre_aportante: a.nombre_aportante ?? '',
  email_aportante: a.email_aportante ?? '',
  notas: a.notas ?? '',
});

const AportesAdmin = () => {
  const queryClient = useQueryClient();
  const { data: aportes = [], isPending, error } = useAportes();
  const { data: destinos = [] } = useDestinos();

  const { query, setQuery, filtered } = useSearch(aportes, [
    'nombre_aportante', 'email_aportante', 'notas', 'destino.nombre',
  ]);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVacio);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  // Re-imputación: cambiar SOLO el destino de un aporte de pasarela. Estado
  // aparte del formulario general porque es otra decisión y otro alcance.
  const [reimputando, setReimputando] = useState(null);
  const [nuevoDestino, setNuevoDestino] = useState('');

  // El total sigue a lo filtrado, no a la lista completa: buscar "efectivo" y
  // ver el total de esa búsqueda es exactamente lo que hace falta para cuadrar.
  const total = useMemo(
    () => filtered.reduce((suma, a) => suma + Number(a.monto || 0), 0),
    [filtered]
  );

  // Cerrados y borradores incluidos: un aporte puede entrar a una campaña que ya
  // cerró (llegó una transferencia atrasada) y hay que poder registrarlo.
  const destinosOrdenados = useMemo(
    () => [...destinos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [destinos]
  );

  // Un aporte cambia el `monto_recaudado` de su destino, así que hay que
  // invalidar las dos claves o la pantalla de Destinos queda mostrando el total viejo.
  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.aportes });
    queryClient.invalidateQueries({ queryKey: queryKeys.destinos });
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formVacio());
    setErrores({});
    setAbierto(true);
  };

  const abrirEdicion = (a) => {
    setEditando(a);
    setForm(aFormulario(a));
    setErrores({});
    setAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const encontrados = validarAporte(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    const payload = aPayloadAporte(form);
    // La capa de datos NO lanza: se mira `error`, no se envuelve en try/catch.
    const { error: fallo } = editando
      ? await updateAporte(editando.id, payload)
      : await createAporteManual(payload);
    setGuardando(false);

    if (fallo) {
      toast({ title: 'No se pudo guardar', description: fallo.message, variant: 'destructive' });
      return;
    }

    toast({
      title: editando ? 'Aporte corregido' : 'Aporte registrado',
      description: editando ? undefined : 'Ya suma al total de su destino.',
    });
    setAbierto(false);
    invalidar();
  };

  const guardarReimputacion = async () => {
    if (!nuevoDestino || nuevoDestino === reimputando.destino_id) {
      setReimputando(null);
      return;
    }

    setGuardando(true);
    const { error: fallo } = await reimputarAporte(reimputando.id, nuevoDestino);
    setGuardando(false);

    if (fallo) {
      toast({ title: 'No se pudo cambiar el destino', description: fallo.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Destino cambiado',
      description: 'Los totales de los dos destinos se recalcularon.',
    });
    setReimputando(null);
    invalidar();
  };

  if (isPending) return <ListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar los aportes"
        // TanStack devuelve un Error, no un string: renderizar el objeto rompe la página.
        description={error?.message}
      />
    );
  }

  const sinDestinos = destinosOrdenados.length === 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={BookOpen}
        title="Libro de aportes"
        description="Todo lo que entró y a qué destino fue. Acá se registra el efectivo, las transferencias y los cheques."
        actions={
          <Button onClick={abrirNuevo} variant="action" disabled={sinDestinos}>
            <Plus className="w-4 h-4 mr-2" /> Registrar aporte
          </Button>
        }
      />

      {/* Sin destinos no hay dónde imputar: `aportes.destino_id` es NOT NULL. */}
      {sinDestinos && (
        <p className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Primero creá un destino en la sección Destinos: todo aporte tiene que ir a alguno.
        </p>
      )}

      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por aportante, destino o nota..." />

      {filtered.length > 0 && (
        <div className="flex items-baseline gap-2 rounded-sm border border-brand-dark/10 bg-white px-5 py-4">
          <Wallet className="w-4 h-4 text-brand-primary" />
          <span className="text-2xl font-bold text-brand-dark tabular-nums">{pesos(total)}</span>
          <span className="text-sm text-gray-500">
            en {filtered.length} {filtered.length === 1 ? 'aporte' : 'aportes'}
            {query ? ' (de la búsqueda)' : ''}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={query ? 'Sin resultados' : 'El libro está vacío'}
          description={
            query
              ? 'Probá con otra búsqueda.'
              : 'Registrá el primer aporte para empezar a llevar la cuenta de lo que entra y a dónde va.'
          }
          action={!query && !sinDestinos && (
            <Button onClick={abrirNuevo} variant="action">Registrar aporte</Button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const origen = describirOrigen(a.origen);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border border-brand-dark/10 bg-white p-4"
              >
                <span className="text-xs text-gray-500 tabular-nums w-24 shrink-0">
                  {soloFecha(a.fecha)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-dark truncate">
                    {a.destino?.nombre ?? 'Destino eliminado'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {a.nombre_aportante || a.email_aportante || 'Sin identificar'}
                    {a.notas ? ` · ${a.notas}` : ''}
                  </p>
                </div>

                <Badge className={`shrink-0 border-none ${CLASE_ORIGEN[a.origen] ?? ''}`}>
                  {origen.label}
                </Badge>

                <span className="font-bold text-brand-dark tabular-nums shrink-0">
                  {pesos(a.monto)}
                </span>

                {/* Un aporte manual se corrige entero; uno de pasarela, solo en
                    su destino. Ver la nota 2 del encabezado del archivo. */}
                {a.origen === 'manual' ? (
                  <Button size="sm" variant="outline" onClick={() => abrirEdicion(a)}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Corregir
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setReimputando(a); setNuevoDestino(a.destino_id ?? ''); }}
                  >
                    <Target className="w-3.5 h-3.5 mr-1.5" /> Cambiar destino
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Corregir aporte' : 'Registrar aporte'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'Se corrige y queda el rastro: en un libro contable nada se borra.'
                : 'Para plata que entró por fuera de la pasarela: efectivo, transferencia o cheque.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={guardar} className="space-y-4">
            <div>
              <Label htmlFor="aporte-destino">Destino *</Label>
              <Select
                value={form.destino_id}
                onValueChange={(v) => setForm((f) => ({ ...f, destino_id: v }))}
              >
                <SelectTrigger id="aporte-destino" className="mt-1">
                  <SelectValue placeholder="¿A qué entra este aporte?" />
                </SelectTrigger>
                <SelectContent>
                  {destinosOrdenados.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errores.destino_id && (
                <p className="mt-1 text-xs text-red-600">{errores.destino_id}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aporte-monto">Monto (ARS) *</Label>
                {/* `min="1"` no es decorativo: la validación nativa del
                    navegador corta el submit antes de que corra `validarAporte`,
                    así que el CHECK `monto > 0` de la base queda cubierto dos
                    veces. La red en JS igual hace falta para lo que esquiva al
                    input (pegar un valor, autofill). */}
                <Input
                  id="aporte-monto"
                  type="number"
                  min="1"
                  step="0.01"
                  className="mt-1"
                  value={form.monto}
                  onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                />
                {errores.monto && <p className="mt-1 text-xs text-red-600">{errores.monto}</p>}
              </div>

              <div>
                <Label htmlFor="aporte-fecha">Fecha *</Label>
                <Input
                  id="aporte-fecha"
                  type="date"
                  className="mt-1"
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                />
                {errores.fecha && <p className="mt-1 text-xs text-red-600">{errores.fecha}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="aporte-nombre">Quién aportó</Label>
              <Input
                id="aporte-nombre"
                className="mt-1"
                placeholder="Nombre y apellido"
                value={form.nombre_aportante}
                onChange={(e) => setForm((f) => ({ ...f, nombre_aportante: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="aporte-email">Mail</Label>
              <Input
                id="aporte-email"
                type="email"
                className="mt-1"
                placeholder="Opcional"
                value={form.email_aportante}
                onChange={(e) => setForm((f) => ({ ...f, email_aportante: e.target.value }))}
              />
              {/* Opcional a propósito: sirve para reconciliar con la pasarela más
                  adelante, pero exigirlo impediría registrar un aporte en efectivo. */}
              <p className="mt-1 text-xs text-gray-500">
                Ayuda a reconocer a la misma persona entre la pasarela y el libro. Podés dejarlo vacío.
              </p>
              {errores.email_aportante && (
                <p className="mt-1 text-xs text-red-600">{errores.email_aportante}</p>
              )}
            </div>

            <div>
              <Label htmlFor="aporte-notas">Nota</Label>
              <Textarea
                id="aporte-notas"
                rows={2}
                className="mt-1"
                placeholder="Ej: transferencia 00123, o recibo N.º 45"
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="action" disabled={guardando}>
                {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editando ? 'Guardar corrección' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(reimputando)} onOpenChange={(v) => !v && setReimputando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar destino</DialogTitle>
            <DialogDescription>
              Se cambia únicamente a qué destino se imputa. El monto y la fecha los informó la
              pasarela y no se tocan.
            </DialogDescription>
          </DialogHeader>

          {reimputando && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-brand-dark">{pesos(reimputando.monto)}</span>
                {' '}del {soloFecha(reimputando.fecha)}, hoy en{' '}
                <span className="font-semibold">{reimputando.destino?.nombre ?? '—'}</span>.
              </p>

              <div>
                <Label htmlFor="reimputar-destino">Nuevo destino</Label>
                <Select value={nuevoDestino} onValueChange={setNuevoDestino}>
                  <SelectTrigger id="reimputar-destino" className="mt-1">
                    <SelectValue placeholder="Elegí el destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinosOrdenados.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setReimputando(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="action" onClick={guardarReimputacion} disabled={guardando}>
              {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cambiar destino
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AportesAdmin;
