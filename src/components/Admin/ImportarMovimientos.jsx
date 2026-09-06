// src/components/Admin/ImportarMovimientos.jsx
//
// Pegar un extracto y que salga la rendición — ROADMAP §14.2.
//
// POR QUÉ ESTA PANTALLA ES EL ÍTEM CON MÁS VALOR DEL PROYECTO
//
// La maquinaria de rendición está desplegada desde el 2026-08-16 y al 2026-09-06
// tenía **cero gastos cargados**. No falló el código: cargar de a uno no escala.
// La Fundación tiene 23 meses de extractos con impuestos y comisiones incluidos.
// Sin esto, esa rendición no se llena nunca — y una rendición vacía es peor que
// no tenerla, porque la promesa queda publicada y sin cumplir.
//
// LAS TRES REGLAS DE ESTA PANTALLA:
//
//  1. **Propone, no ejecuta.** Nada se escribe hasta que alguien mira la
//     previsualización y aprieta. Las heurísticas de clasificación aciertan la
//     mayoría de las veces y se equivocan algunas; el trabajo de la persona es
//     destildar tres filas, no escribir cuatrocientas.
//  2. **Nada entra publicado.** Un movimiento bancario puede traer el nombre de
//     un particular en la descripción, y publicar un gasto lo publica entero.
//     Revisar y publicar es un acto aparte.
//  3. **Reimportar es seguro.** La previsualización marca lo ya cargado y el
//     INSERT igual usa `ignoreDuplicates`. Que se pueda pegar el mismo extracto
//     dos veces sin miedo es lo que hace que alguien se anime a empezar.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useDestinos } from '@/hooks/useContentQueries';
import {
  parsearExtracto, resumirLote, verificarSaldoCorrido, verificarTotales,
} from '@/lib/importarMovimientos';
import { getReferenciasCargadas, importarLote } from '@/api/importarApi';
import SectionHeader from '@/components/Admin/shared/SectionHeader';

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const ImportarMovimientos = () => {
  const queryClient = useQueryClient();
  const { data: destinos = [] } = useDestinos();

  const [texto, setTexto] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [analisis, setAnalisis] = useState(null); // { filas, errores, yaCargadas }
  const [excluidas, setExcluidas] = useState(() => new Set());
  const [trabajando, setTrabajando] = useState(false);

  const analizar = async () => {
    setTrabajando(true);
    const { filas, errores, declarado } = parsearExtracto(texto);

    if (errores.length) {
      setAnalisis({ filas: [], errores, declarado: null, yaCargadas: new Set() });
      setTrabajando(false);
      return;
    }

    const refs = filas.map((f) => f.referencia).filter(Boolean);
    const { data: cargadas, error } = await getReferenciasCargadas(refs);
    setTrabajando(false);

    if (error) {
      toast({
        title: 'No se pudo verificar qué ya está cargado',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setExcluidas(new Set());
    setAnalisis({
      filas,
      errores: [],
      declarado,
      yaCargadas: new Set((cargadas ?? []).map((c) => c.referencia_externa)),
    });
  };

  // Lo que efectivamente se va a escribir: sin problemas, sin duplicados y sin
  // lo que la persona destildó.
  const aImportar = useMemo(() => {
    if (!analisis) return [];
    return analisis.filas.filter(
      (f) =>
        !f.problema &&
        !excluidas.has(f.indice) &&
        (!f.referencia || !analisis.yaCargadas.has(f.referencia))
    );
  }, [analisis, excluidas]);

  const resumen = useMemo(
    () => (analisis ? resumirLote(analisis.filas, analisis.yaCargadas) : null),
    [analisis]
  );

  /*
    LAS VERIFICACIONES (§14.3). Salen de datos que el propio resumen de cuenta
    trae —el saldo corrido de cada fila y los totales del encabezado—, así que no
    dependen de que le creemos al parser.

    Son lo que convierte un cambio de formato del banco en un aviso claro en vez
    de en datos silenciosamente mal cargados. Sin ellas, esta pantalla sería un
    acto de fe.
  */
  const verificaciones = useMemo(() => {
    if (!analisis?.declarado) return null;
    return {
      saldo: verificarSaldoCorrido(analisis.filas, analisis.declarado.saldoInicial),
      totales: verificarTotales(analisis.filas, analisis.declarado),
    };
  }, [analisis]);

  // Con las verificaciones en rojo NO se importa: cargar un lote que no cuadra
  // contra lo que declara el banco es meter un error que después hay que buscar
  // movimiento por movimiento.
  const cuadra =
    !verificaciones || (verificaciones.saldo?.ok !== false && verificaciones.totales?.ok !== false);

  const importar = async () => {
    if (!destinoId) {
      toast({ title: 'Elegí a qué destino se imputa el lote', variant: 'destructive' });
      return;
    }
    setTrabajando(true);
    const { data } = await importarLote({ filas: aImportar, destinoId });
    setTrabajando(false);

    if (data.errores.length) {
      toast({
        title: 'La importación entró a medias',
        description: `${data.aportes} aportes y ${data.gastos} gastos. ${data.errores[0]}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Importado',
        description:
          `${data.aportes} aportes y ${data.gastos} gastos. ` +
          'Los gastos entraron SIN publicar: revisalos antes de mostrarlos.',
      });
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.aportes });
    queryClient.invalidateQueries({ queryKey: queryKeys.gastos });
    queryClient.invalidateQueries({ queryKey: queryKeys.destinos });

    // Se vuelve a analizar en vez de limpiar: así la persona ve que lo que
    // acaba de entrar ahora figura como "ya cargado", que es la prueba visible
    // de que reimportar no duplica.
    await analizar();
  };

  const alternar = (indice) => {
    setExcluidas((prev) => {
      const s = new Set(prev);
      if (s.has(indice)) s.delete(indice);
      else s.add(indice);
      return s;
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        icon={FileSpreadsheet}
        title="Importar movimientos"
        description="Pegá el extracto de la cuenta y se propone qué cargar. Nada se escribe hasta que lo confirmes, y volver a pegar el mismo período no duplica nada."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <Label htmlFor="extracto">Extracto pegado</Label>
          <Textarea
            id="extracto"
            className="mt-1 font-mono text-xs h-48"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Fecha\tDescripción\tID de la operación\tValor\tSaldo\n10-10-2024\tTransferencia enviada …\t90165423466\t$ -937.776,27\t…'}
          />
          <p className="mt-1 text-xs text-brand-dark/55">
            La primera línea tiene que ser el encabezado. Sirve lo que copies de la planilla
            del extracto, separado por tabulaciones, punto y coma o comas.
          </p>
        </div>

        <div>
          <Label htmlFor="destino-lote">Destino del lote</Label>
          <Select value={destinoId} onValueChange={setDestinoId}>
            <SelectTrigger id="destino-lote" className="mt-1">
              <SelectValue placeholder="Elegí un destino" />
            </SelectTrigger>
            <SelectContent>
              {destinos.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-brand-dark/55">
            Todo el lote se imputa acá. Si un extracto mezcla destinos, conviene importarlo
            por partes: reimputar después es más trabajo que separar antes.
          </p>

          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={analizar}
            disabled={!texto.trim() || trabajando}
          >
            {trabajando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Analizar
          </Button>
        </div>
      </div>

      {analisis?.errores?.length > 0 && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="inline h-4 w-4 mr-1.5" />
          {analisis.errores.join(' ')}
        </div>
      )}

      {verificaciones && (
        <div
          className={`mb-4 rounded-sm border p-4 text-sm ${
            cuadra ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}
        >
          <p className="font-bold text-brand-dark mb-2">
            {cuadra
              ? 'Lo extraído cuadra con lo que declara el resumen'
              : 'Lo extraído NO cuadra con lo que declara el resumen'}
          </p>

          <ul className="space-y-1 text-brand-dark/75">
            <li>
              {verificaciones.saldo?.ok ? '✅' : '❌'} <strong>Saldo corrido:</strong>{' '}
              {verificaciones.saldo?.ok
                ? `${analisis.filas.length} movimientos, sin desvíos`
                : `${verificaciones.saldo?.desvios.length} desvío(s) — hay un importe mal leído`}
            </li>
            <li>
              {verificaciones.totales?.ok ? '✅' : '❌'} <strong>Totales del período:</strong>{' '}
              entradas {pesos(verificaciones.totales?.entradas.extraido)} contra{' '}
              {pesos(verificaciones.totales?.entradas.declarado)} declaradas · salidas{' '}
              {pesos(verificaciones.totales?.salidas.extraido)} contra{' '}
              {pesos(verificaciones.totales?.salidas.declarado)}
            </li>
          </ul>

          {!cuadra && (
            <p className="mt-2 text-red-800">
              No se puede importar hasta que cuadre. Lo más probable: el texto pegado está
              incompleto, o falta una parte del período.
            </p>
          )}
        </div>
      )}

      {resumen && analisis.filas.length > 0 && (
        <>
          <div className="rounded-sm border border-brand-dark/10 bg-white p-4 mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm tabular-nums">
            <span>
              <strong>{resumen.aportes}</strong> aportes · {pesos(resumen.montoAportes)}
            </span>
            <span>
              <strong>{resumen.gastos}</strong> gastos · {pesos(resumen.montoGastos)}
            </span>
            {resumen.duplicadas > 0 && (
              <span className="text-brand-dark/60">
                <strong>{resumen.duplicadas}</strong> ya cargados, se saltean
              </span>
            )}
            {resumen.conProblema > 0 && (
              <span className="text-amber-700">
                <strong>{resumen.conProblema}</strong> sin entender
              </span>
            )}
          </div>

          <div className="rounded-sm border border-brand-dark/10 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-sand text-left">
                <tr>
                  <th className="p-2 w-8" />
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Descripción</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/10">
                {analisis.filas.map((f) => {
                  const yaEsta = f.referencia && analisis.yaCargadas.has(f.referencia);
                  const entra = !f.problema && !yaEsta && !excluidas.has(f.indice);
                  return (
                    <tr key={f.indice} className={entra ? '' : 'opacity-50'}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={entra}
                          disabled={Boolean(f.problema) || Boolean(yaEsta)}
                          onChange={() => alternar(f.indice)}
                          aria-label={`Incluir el movimiento ${f.descripcion}`}
                        />
                      </td>
                      <td className="p-2 tabular-nums whitespace-nowrap">{f.fecha ?? '—'}</td>
                      <td className="p-2 max-w-xs truncate" title={f.descripcion}>
                        {f.descripcion || f.linea}
                      </td>
                      <td className="p-2 text-brand-dark/60">{f.categoria ?? '—'}</td>
                      <td
                        className={`p-2 text-right tabular-nums whitespace-nowrap ${
                          f.tipo === 'aporte' ? 'text-green-700' : 'text-brand-dark'
                        }`}
                      >
                        {f.monto != null ? pesos(f.monto) : '—'}
                      </td>
                      <td className="p-2 text-xs">
                        {f.problema && <span className="text-amber-700">{f.problema}</span>}
                        {yaEsta && <span className="text-brand-dark/50">Ya cargado</span>}
                        {f.aviso && <span className="text-amber-700">{f.aviso}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="action"
              onClick={importar}
              disabled={!aImportar.length || !destinoId || trabajando || !cuadra}
            >
              {trabajando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar {aImportar.length} {aImportar.length === 1 ? 'movimiento' : 'movimientos'}
            </Button>
            <span className="text-xs text-brand-dark/55 inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Los gastos entran sin publicar: se revisan y se publican después.
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default ImportarMovimientos;
