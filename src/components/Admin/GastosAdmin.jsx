// src/components/Admin/GastosAdmin.jsx
//
// Los egresos y su rendición (ROADMAP §10.9, fase 2). Es la mitad que le faltaba
// al libro: sin esto hay recaudación con destino declarado, no rendición.
//
// Cuatro decisiones de esta pantalla que no son cosméticas:
//
//  1. **Publicar es una acción aparte de guardar.** Corregir un dato es interno;
//     publicarlo es un acto hacia afuera y tiene que costar un clic propio y
//     deliberado. Por eso el botón vive en la fila, con su estado bien visible.
//
//  2. **Publicar un gasto lo publica ENTERO**, notas incluidas. La UI lo dice
//     donde se escriben las notas, no en una ayuda escondida.
//
//  3. **El comprobante nunca se publica.** Una factura trae CUIT, domicilio y a
//     veces la firma de un tercero que no consintió. El público ve que existe
//     —o que falta—, no el archivo.
//
//  4. **Ninguna fila ofrece borrar.** `gastos` no tiene el GRANT de DELETE: un
//     libro contable no se borra, se corrige y queda el rastro.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Receipt, Edit, Loader2, AlertTriangle, Eye, EyeOff, Paperclip, X, Download,
} from 'lucide-react';
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
import { TIPOS_COMPROBANTE, describirComprobante } from '@/lib/comprobantes';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useGastos, useDestinos } from '@/hooks/useContentQueries';
import {
  createGasto, updateGasto, setPublicado, subirComprobante, quitarComprobante,
  urlComprobante, validarGasto, aPayloadGasto, balanceDestino, hoyISO,
} from '@/api/gastosApi';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
const soloFecha = (v) => (v ? String(v).slice(0, 10) : '—');

const formVacio = () => ({
  destino_id: '',
  concepto: '',
  monto: '',
  fecha: hoyISO(),
  categoria: '',
  tipo_comprobante: '',
  comprobante_numero: '',
  proveedor: '',
  notas: '',
  publicado: false,
});

const aFormulario = (g) => ({
  destino_id: g.destino_id ?? '',
  concepto: g.concepto ?? '',
  monto: g.monto ?? '',
  fecha: soloFecha(g.fecha),
  categoria: g.categoria ?? '',
  tipo_comprobante: g.tipo_comprobante ?? '',
  comprobante_numero: g.comprobante_numero ?? '',
  proveedor: g.proveedor ?? '',
  notas: g.notas ?? '',
  publicado: Boolean(g.publicado),
});

const GastosAdmin = () => {
  const queryClient = useQueryClient();
  const { data: gastos = [], isPending, error } = useGastos();
  const { data: destinos = [] } = useDestinos();

  const { query, setQuery, filtered } = useSearch(gastos, [
    'concepto', 'categoria', 'proveedor', 'notas', 'destino.nombre',
  ]);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVacio);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [ocupadoId, setOcupadoId] = useState(null);

  // Dos totales distintos y los dos verdaderos: lo gastado es lo que la comisión
  // sabe, lo rendido es lo que el público puede ver. Mostrar solo uno esconde
  // justamente la brecha que esta pantalla existe para cerrar.
  const totales = useMemo(() => {
    const gastado = filtered.reduce((s, g) => s + Number(g.monto || 0), 0);
    const rendido = filtered
      .filter((g) => g.publicado)
      .reduce((s, g) => s + Number(g.monto || 0), 0);
    const sinComprobante = filtered.filter((g) => !g.tiene_comprobante).length;
    return { gastado, rendido, sinComprobante };
  }, [filtered]);

  const destinosOrdenados = useMemo(
    () => [...destinos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [destinos]
  );

  // El destino elegido en el formulario, para mostrar su saldo mientras se carga.
  const destinoDelForm = destinosOrdenados.find((d) => d.id === form.destino_id) ?? null;
  const balance = destinoDelForm ? balanceDestino(destinoDelForm) : null;

  // Un gasto mueve `destinos.monto_rendido`, así que hay que invalidar las dos
  // claves o la pantalla de Destinos queda mostrando la rendición vieja.
  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gastos });
    queryClient.invalidateQueries({ queryKey: queryKeys.destinos });
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formVacio());
    setErrores({});
    setAbierto(true);
  };

  const abrirEdicion = (g) => {
    setEditando(g);
    setForm(aFormulario(g));
    setErrores({});
    setAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const encontrados = validarGasto(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setGuardando(true);
    const payload = aPayloadGasto(form);
    // La capa de datos NO lanza: se mira `error`, no se envuelve en try/catch.
    const { error: fallo } = editando
      ? await updateGasto(editando.id, payload)
      : await createGasto(payload);
    setGuardando(false);

    if (fallo) {
      toast({ title: 'No se pudo guardar', description: fallo.message, variant: 'destructive' });
      return;
    }

    toast({ title: editando ? 'Gasto corregido' : 'Gasto registrado' });
    setAbierto(false);
    invalidar();
  };

  const alternarPublicado = async (g) => {
    setOcupadoId(g.id);
    const { error: fallo } = await setPublicado(g.id, !g.publicado);
    setOcupadoId(null);

    if (fallo) {
      toast({ title: 'No se pudo cambiar', description: fallo.message, variant: 'destructive' });
      return;
    }
    toast({
      title: g.publicado ? 'Gasto despublicado' : 'Gasto publicado',
      description: g.publicado
        ? 'Dejó de verse en la rendición pública.'
        : 'Ya se ve en la rendición pública, con todos sus datos.',
    });
    invalidar();
  };

  const adjuntar = async (g, file) => {
    if (!file) return;
    setOcupadoId(g.id);
    const { error: fallo } = await subirComprobante({ gastoId: g.id, file });
    setOcupadoId(null);

    if (fallo) {
      toast({ title: 'No se pudo adjuntar', description: fallo.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Comprobante adjuntado' });
    invalidar();
  };

  const quitar = async (g) => {
    setOcupadoId(g.id);
    const { error: fallo } = await quitarComprobante(g);
    setOcupadoId(null);

    if (fallo) {
      toast({ title: 'No se pudo quitar', description: fallo.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Comprobante quitado' });
    invalidar();
  };

  const abrirComprobante = async (g) => {
    const { data: url, error: fallo } = await urlComprobante(g.comprobante_path, { download: false });
    if (fallo || !url) {
      toast({
        title: 'No se pudo abrir el comprobante',
        description: fallo?.message || 'No se obtuvo un enlace válido.',
        variant: 'destructive',
      });
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isPending) return <ListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar los gastos"
        // TanStack devuelve un Error, no un string: renderizar el objeto rompe la página.
        description={error?.message}
      />
    );
  }

  const sinDestinos = destinosOrdenados.length === 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Receipt}
        title="Gastos y rendición"
        description="En qué se gastó y con qué respaldo. Lo que se publica acá es lo que cualquiera puede ver."
        actions={
          <Button onClick={abrirNuevo} variant="action" disabled={sinDestinos}>
            <Plus className="w-4 h-4 mr-2" /> Registrar gasto
          </Button>
        }
      />

      {sinDestinos && (
        <p className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Primero creá un destino en la sección Destinos: todo gasto sale de alguno.
        </p>
      )}

      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por concepto, proveedor o destino..." />

      {filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-sm border border-brand-dark/10 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Gastado</p>
            <p className="text-2xl font-bold text-brand-dark tabular-nums">{pesos(totales.gastado)}</p>
            <p className="text-xs text-gray-500">{filtered.length} {filtered.length === 1 ? 'gasto' : 'gastos'}</p>
          </div>
          <div className="rounded-sm border border-brand-dark/10 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Rendido (público)</p>
            <p className="text-2xl font-bold text-brand-primary tabular-nums">{pesos(totales.rendido)}</p>
            <p className="text-xs text-gray-500">Lo que cualquiera puede ver</p>
          </div>
          <div className="rounded-sm border border-brand-dark/10 bg-white px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sin comprobante</p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{totales.sinComprobante}</p>
            <p className="text-xs text-gray-500">Se muestran igual, marcados</p>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={query ? 'Sin resultados' : 'Todavía no hay gastos'}
          description={
            query
              ? 'Probá con otra búsqueda.'
              : 'Registrá el primero para poder mostrar en qué se usó lo que se recaudó.'
          }
          action={!query && !sinDestinos && (
            <Button onClick={abrirNuevo} variant="action">Registrar gasto</Button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-sm border border-brand-dark/10 bg-white p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs text-gray-500 tabular-nums w-24 shrink-0">
                  {soloFecha(g.fecha)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-dark truncate">{g.concepto}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {g.destino?.nombre ?? 'Destino eliminado'}
                    {g.categoria ? ` · ${g.categoria}` : ''}
                    {(g.tipo_comprobante || g.tiene_comprobante)
                      ? ` · ${describirComprobante(g)}`
                      : ''}
                    {g.proveedor ? ` · ${g.proveedor}` : ''}
                  </p>
                </div>

                <Badge
                  className={`shrink-0 border-none ${
                    g.publicado ? 'bg-green-500/10 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {g.publicado ? 'Publicado' : 'Interno'}
                </Badge>

                <span className="font-bold text-brand-dark tabular-nums shrink-0">
                  {pesos(g.monto)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => abrirEdicion(g)}>
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Corregir
                </Button>

                <Button
                  size="sm"
                  variant={g.publicado ? 'ghost' : 'outline'}
                  onClick={() => alternarPublicado(g)}
                  disabled={ocupadoId === g.id}
                >
                  {g.publicado
                    ? <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Despublicar</>
                    : <><Eye className="w-3.5 h-3.5 mr-1.5" /> Publicar</>}
                </Button>

                {g.tiene_comprobante ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => abrirComprobante(g)}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {g.comprobante_nombre || 'Ver comprobante'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => quitar(g)}
                      disabled={ocupadoId === g.id}
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" /> Quitar
                    </Button>
                  </>
                ) : (
                  <label className="inline-flex">
                    <span
                      className="inline-flex h-9 cursor-pointer items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-800 hover:bg-amber-100"
                    >
                      <Paperclip className="w-3.5 h-3.5 mr-1.5" /> Adjuntar comprobante
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        adjuntar(g, e.target.files?.[0]);
                        // Se limpia para que volver a elegir el MISMO archivo
                        // vuelva a disparar onChange.
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}

                {ocupadoId === g.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        {/*
          ⚠️ EL ANCHO ES LO QUE EVITA EL SCROLL, NO RECORTAR EL CONTENIDO.
          Con `max-w-lg` (512px) los nueve campos entraban sólo de a uno o de a
          dos, y el modal medía más que la pantalla: había que scrollear para
          llegar a «Guardar corrección». Un formulario contable que no se ve
          entero invita a completar la mitad.

          `max-h-[90vh] overflow-y-auto` se queda como red de seguridad para
          pantallas bajas, pero a este ancho ya no debería activarse.
        */}
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Corregir gasto' : 'Registrar gasto'}</DialogTitle>
            <DialogDescription>
              {editando
                ? 'Se corrige y queda el rastro: en un libro contable nada se borra.'
                : 'Nace sin publicar. El comprobante se adjunta después, desde la lista.'}
            </DialogDescription>
          </DialogHeader>

          {/*
            UNA SOLA GRILLA PARA TODO EL FORMULARIO, y no una grilla por fila.
            Anidar grillas fue justamente lo que rompió el layout antes: el bloque
            del comprobante terminó siendo el tercer item de la grilla de
            categoría, ocupando un cuarto del ancho. Con seis columnas, cada campo
            declara cuánto mide y no hay jerarquía que se pueda confundir.
          */}
          <form onSubmit={guardar} className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-2">
            <div className="md:col-span-4">
              {/* El saldo va en la MISMA línea que la etiqueta, no debajo: es una
                  fila entera de alto en un formulario que pelea por no scrollear. */}
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="gasto-destino">Destino *</Label>
                {balance && (
                  <span className="text-xs text-gray-500 tabular-nums truncate">
                    recaudado {pesos(balance.recaudado)} · rendido {pesos(balance.rendido)} ·{' '}
                    <span className={balance.saldo < 0 ? 'font-semibold text-red-600' : 'font-semibold text-brand-dark'}>
                      saldo {pesos(balance.saldo)}
                    </span>
                  </span>
                )}
              </div>
              <Select
                value={form.destino_id}
                onValueChange={(v) => setForm((f) => ({ ...f, destino_id: v }))}
              >
                <SelectTrigger id="gasto-destino" className="mt-1">
                  <SelectValue placeholder="¿De dónde sale este gasto?" />
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

            <div className="md:col-span-2">
              <Label htmlFor="gasto-fecha">Fecha *</Label>
              <Input
                id="gasto-fecha"
                type="date"
                className="mt-1"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
              {errores.fecha && <p className="mt-1 text-xs text-red-600">{errores.fecha}</p>}
            </div>

            <div className="md:col-span-6">
              <Label htmlFor="gasto-concepto">En qué se gastó *</Label>
              <Input
                id="gasto-concepto"
                className="mt-1"
                placeholder="Ej: 12 pelotas N.º 5"
                value={form.concepto}
                onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
              />
              {errores.concepto && <p className="mt-1 text-xs text-red-600">{errores.concepto}</p>}
              {/* Los textos de ayuda de este formulario son cortos a propósito:
                  cada línea que ocupan es altura, y la altura es lo que devuelve
                  el scroll. El razonamiento largo vive en los comentarios. */}
              <p className="mt-1 text-xs text-brand-dark/55">
                Es lo que se lee en la rendición pública: <strong>para qué fue</strong>, no
                de quién se cobró.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="gasto-monto">Monto (ARS) *</Label>
              <Input
                id="gasto-monto"
                type="number"
                min="1"
                step="0.01"
                className="mt-1"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              />
              {errores.monto && <p className="mt-1 text-xs text-red-600">{errores.monto}</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="gasto-categoria">Categoría</Label>
              <Input
                id="gasto-categoria"
                className="mt-1"
                placeholder="Ej: materiales"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              />
              {/* Texto libre a propósito: las categorías varían por rubro y son
                  dato de la entidad, no estructura del sistema. */}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="gasto-proveedor">Proveedor</Label>
              <Input
                id="gasto-proveedor"
                className="mt-1"
                placeholder="Ej: Ferretería del Centro"
                value={form.proveedor}
                onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
              />
              {/* La misma advertencia que en la nota, y por el mismo motivo:
                  publicar un gasto publica TAMBIÉN este campo. Desde §14.3 el
                  importador ya no lo completa solo con la contraparte del
                  extracto, que en una cuenta bancaria suele ser una persona. */}
              <p className="mt-1 text-xs text-amber-700">
                Se publica. Un comercio, no una persona.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="gasto-tipo-comp">Tipo de comprobante</Label>
              <Select
                value={form.tipo_comprobante || 'ninguno'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo_comprobante: v === 'ninguno' ? '' : v }))}
              >
                <SelectTrigger id="gasto-tipo-comp" className="mt-1">
                  <SelectValue placeholder="Sin declarar" />
                </SelectTrigger>
                <SelectContent>
                  {/* «Sin declarar» es una opción de verdad y no un hueco: hay
                      respaldos legítimos que no encajan en ninguna categoría, y
                      obligar a elegir haría que se marque cualquiera. */}
                  <SelectItem value="ninguno">Sin declarar</SelectItem>
                  {TIPOS_COMPROBANTE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-brand-dark/55">
                Declararlo suma credibilidad.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="gasto-num-comp">Número del comprobante</Label>
              <Input
                id="gasto-num-comp"
                className="mt-1"
                value={form.comprobante_numero}
                onChange={(e) =>
                  setForm((f) => ({ ...f, comprobante_numero: e.target.value }))}
                placeholder="Ej: A-0001-00000123"
              />
              <p className="mt-1 text-xs text-brand-dark/55">
                La letra, el punto de venta o el CAE.
              </p>
            </div>

            {/* La nota comparte fila con el comprobante en vez de tener la suya:
                una fila menos son ~107px, y es la diferencia entre entrar o no en
                una pantalla de 768 de alto. */}
            <div className="md:col-span-2">
              <Label htmlFor="gasto-notas">Nota</Label>
              <Textarea
                id="gasto-notas"
                rows={2}
                className="mt-1"
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              />
              {/* La advertencia va acá, donde se escribe, y no en una ayuda
                  escondida: publicar un gasto publica también sus notas. */}
              <p className="mt-1 text-xs text-amber-700">
                Se publica con el gasto: no escribas acá nada que no pueda ser público.
              </p>
            </div>

            <DialogFooter className="md:col-span-6 mt-1">
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
    </div>
  );
};

export default GastosAdmin;
