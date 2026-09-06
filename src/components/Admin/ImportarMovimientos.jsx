// src/components/Admin/ImportarMovimientos.jsx
//
// Subir los extractos de la cuenta y que salga la rendición — ROADMAP §14.2/§14.3.
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
//     INSERT igual usa `ignoreDuplicates`. Que se pueda subir el mismo extracto
//     dos veces sin miedo es lo que hace que alguien se anime a empezar.
//
// ⚠️ **LO QUE NO CUADRA NO SE IMPORTA, Y LO INCOMPLETO SÍ.** Es la distinción que
// ordena las tres verificaciones y no es un detalle de UI:
//   · niveles 1 y 2 (saldo corrido y totales del período) fallan cuando lo que se
//     leyó **está mal** — un importe mal interpretado, un archivo cortado. Eso
//     bloquea: cargarlo mete un error que después hay que buscar movimiento por
//     movimiento contra el extracto en papel.
//   · el nivel 3 (cadena entre resúmenes) falla cuando **falta un mes**. Eso avisa
//     pero no bloquea: importar octubre y diciembre sin noviembre es incompleto,
//     no incorrecto, y es exactamente lo que hace alguien que va bajando los
//     extractos de a uno.
import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Loader2, AlertTriangle, CheckCircle2, FileSpreadsheet, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useDestinos } from '@/hooks/useContentQueries';
import {
  consolidarArchivos, anterioresA, delDiaDelInicio, resumirLote,
  verificarSaldoCorrido, verificarTotales, verificarCadena,
} from '@/lib/importarMovimientos';
import { getReferenciasCargadas, importarLote } from '@/api/importarApi';
import SectionHeader from '@/components/Admin/shared/SectionHeader';

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const enFecha = (iso, opciones) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', opciones) : '—';

const ImportarMovimientos = () => {
  const queryClient = useQueryClient();
  const { data: destinos = [] } = useDestinos();
  const inputArchivos = useRef(null);

  const [texto, setTexto] = useState('');
  const [archivos, setArchivos] = useState([]); // [{ nombre, texto }]
  const [destinoId, setDestinoId] = useState('');
  const [analisis, setAnalisis] = useState(null); // { resumenes, filas, errores, yaCargadas }
  const [trabajando, setTrabajando] = useState(false);

  /*
    UNA SOLA DECISIÓN POR FILA, Y ES UN OVERRIDE.

    No es un set de "excluidas" sino un mapa `indice -> entra`, porque el default
    ya no es siempre "sí": una fila anterior a la fecha de inicio del destino
    nace destildada. Con un set de exclusiones, cambiar de destino tendría que
    reescribir el estado —y pisaría lo que la persona destildó a mano—. Con el
    override, el default se recalcula solo y las decisiones manuales sobreviven.
  */
  const [decisiones, setDecisiones] = useState(() => new Map());

  const destino = destinos.find((d) => d.id === destinoId) ?? null;

  const analizar = async (entradas) => {
    const fuentes = entradas ?? (archivos.length ? archivos : [{ nombre: 'Pegado', texto }]);
    setTrabajando(true);
    const { resumenes, filas, errores } = consolidarArchivos(fuentes);

    if (errores.length) {
      setAnalisis({ resumenes: [], filas: [], errores, yaCargadas: new Set() });
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

    setDecisiones(new Map());
    setAnalisis({
      resumenes,
      filas,
      errores: [],
      yaCargadas: new Set((cargadas ?? []).map((c) => c.referencia_externa)),
    });
  };

  const elegirArchivos = async (e) => {
    const lista = Array.from(e.target.files ?? []);
    if (!lista.length) return;
    // `Blob.text()` y no FileReader: son 23 archivos, y esto es una promesa por
    // archivo en vez de 23 callbacks anidados.
    const leidos = await Promise.all(
      lista.map(async (f) => ({ nombre: f.name, texto: await f.text() }))
    );
    setArchivos(leidos);
    setTexto('');
    await analizar(leidos);
  };

  const limpiarArchivos = () => {
    setArchivos([]);
    setAnalisis(null);
    setDecisiones(new Map());
    if (inputArchivos.current) inputArchivos.current.value = '';
  };

  // Los movimientos anteriores a la fecha de inicio del destino: son de la etapa
  // previa y no le pertenecen al fondo. Nacen destildados, no bloqueados.
  const anteriores = useMemo(
    () => (analisis ? anterioresA(analisis.filas, destino?.fecha_inicio) : new Set()),
    [analisis, destino?.fecha_inicio]
  );

  // Los del día mismo del inicio. Se marcan pero NO se destildan: un fondo puede
  // arrancar a mitad de un día, así que ahí conviven movimientos de las dos
  // etapas y ninguna regla automática puede separarlos sin equivocarse.
  const delDia = useMemo(
    () => (analisis ? delDiaDelInicio(analisis.filas, destino?.fecha_inicio) : new Set()),
    [analisis, destino?.fecha_inicio]
  );

  const estadoDe = (f) => {
    const yaEsta = Boolean(f.referencia && analisis.yaCargadas.has(f.referencia));
    const bloqueada = Boolean(f.problema) || yaEsta;
    const porDefecto = !bloqueada && !anteriores.has(f.indice);
    const entra = bloqueada ? false : decisiones.get(f.indice) ?? porDefecto;
    return { yaEsta, bloqueada, entra };
  };

  const aImportar = useMemo(
    () => (analisis ? analisis.filas.filter((f) => estadoDe(f).entra) : []),
    [analisis, decisiones, anteriores] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const resumen = useMemo(
    () => (analisis ? resumirLote(analisis.filas, analisis.yaCargadas) : null),
    [analisis]
  );

  /*
    LAS VERIFICACIONES (§14.3). Salen de datos que el propio resumen de cuenta
    trae —el saldo corrido de cada fila y los totales del encabezado—, así que no
    dependen de que le creamos al parser.

    Los niveles 1 y 2 son POR ARCHIVO: cada extracto declara sus propios totales,
    y sumarlos todos juntos escondería justo el archivo que no cuadra.
  */
  const verificaciones = useMemo(() => {
    if (!analisis) return [];
    return analisis.resumenes.map((r) => ({
      nombre: r.nombre,
      desde: r.desde,
      movimientos: r.filas.length,
      saldo: r.declarado ? verificarSaldoCorrido(r.filas, r.declarado.saldoInicial) : null,
      totales: r.declarado ? verificarTotales(r.filas, r.declarado) : null,
    }));
  }, [analisis]);

  const cuadra = verificaciones.every((v) => v.saldo?.ok !== false && v.totales?.ok !== false);

  // Nivel 3. Solo tiene sentido con más de un resumen, y avisa sin bloquear.
  const cadena = useMemo(
    () => (analisis && analisis.resumenes.length > 1 ? verificarCadena(analisis.resumenes) : null),
    [analisis]
  );

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

  const alternar = (f) => {
    const { entra } = estadoDe(f);
    setDecisiones((prev) => new Map(prev).set(f.indice, !entra));
  };

  const variosArchivos = (analisis?.resumenes?.length ?? 0) > 1;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        icon={FileSpreadsheet}
        title="Importar movimientos"
        description="Subí los extractos de la cuenta y se propone qué cargar. Podés elegir varios meses juntos; nada se escribe hasta que lo confirmes, y volver a subir el mismo período no duplica nada."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <Label htmlFor="archivos">Extractos (.csv)</Label>
          <input
            ref={inputArchivos}
            id="archivos"
            type="file"
            accept=".csv,text/csv"
            multiple
            onChange={elegirArchivos}
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-brand-sand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-dark hover:file:bg-brand-sand/70"
          />
          <p className="mt-1 text-xs text-brand-dark/55">
            El <code>.csv</code> que baja MercadoPago desde Reportes → Resumen de cuenta.
            Elegí todos los meses de una vez: se ordenan solos por período y se avisa si
            falta alguno. El <code>.xlsx</code> trae exactamente lo mismo, así que no hace
            falta.
          </p>

          {archivos.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-xs text-brand-dark/70">
              <span className="flex-1">
                <strong>{archivos.length}</strong>{' '}
                {archivos.length === 1 ? 'archivo elegido' : 'archivos elegidos'}
              </span>
              <button
                type="button"
                onClick={limpiarArchivos}
                className="inline-flex items-center gap-1 text-brand-dark/60 hover:text-brand-dark"
              >
                <X className="h-3 w-3" /> Quitar
              </button>
            </div>
          )}

          {archivos.length === 0 && (
            <>
              <Label htmlFor="extracto" className="mt-4 block">
                O pegar el extracto a mano
              </Label>
              <Textarea
                id="extracto"
                className="mt-1 font-mono text-xs h-32"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={'Fecha\tDescripción\tID de la operación\tValor\tSaldo\n10-10-2024\tTransferencia enviada …\t90165423466\t$ -937.776,27\t…'}
              />
              <p className="mt-1 text-xs text-brand-dark/55">
                Sirve para un pedazo suelto. La primera línea tiene que ser el encabezado,
                separado por tabulaciones, punto y coma o comas.
              </p>
            </>
          )}
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
          {destino?.fecha_inicio && (
            <p className="mt-1 text-xs text-brand-dark/55">
              Este destino arranca el <strong>{enFecha(destino.fecha_inicio)}</strong>. Lo
              anterior se destilda solo; lo de ese día mismo se marca para que lo revises,
              porque un fondo puede empezar a mitad de un día.
            </p>
          )}

          {archivos.length === 0 && (
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => analizar()}
              disabled={!texto.trim() || trabajando}
            >
              {trabajando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Analizar
            </Button>
          )}
        </div>
      </div>

      {analisis?.errores?.length > 0 && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-1">
          {analisis.errores.map((e) => (
            <p key={e}>
              <AlertTriangle className="inline h-4 w-4 mr-1.5" />
              {e}
            </p>
          ))}
        </div>
      )}

      {verificaciones.length > 0 && (
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

          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-left text-brand-dark/55">
                <tr>
                  <th className="py-1 pr-3 font-semibold">Resumen</th>
                  <th className="py-1 pr-3 font-semibold">Período</th>
                  <th className="py-1 pr-3 font-semibold text-right">Movim.</th>
                  <th className="py-1 pr-3 font-semibold">Saldo corrido</th>
                  <th className="py-1 font-semibold">Totales del período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/10">
                {verificaciones.map((v) => (
                  <tr key={v.nombre}>
                    <td className="py-1 pr-3 max-w-[16rem] truncate" title={v.nombre}>
                      {v.nombre}
                    </td>
                    <td className="py-1 pr-3 whitespace-nowrap">
                      {enFecha(v.desde, { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-1 pr-3 text-right">{v.movimientos}</td>
                    <td className="py-1 pr-3 whitespace-nowrap">
                      {!v.saldo && <span className="text-brand-dark/40">sin saldo declarado</span>}
                      {v.saldo?.ok === true && '✅ sin desvíos'}
                      {v.saldo?.ok === false && (
                        <span className="text-red-800">
                          ❌ {v.saldo.desvios.length} desvío(s) — hay un importe mal leído
                        </span>
                      )}
                    </td>
                    <td className="py-1 whitespace-nowrap">
                      {!v.totales && (
                        <span className="text-brand-dark/40">sin totales declarados</span>
                      )}
                      {v.totales?.ok === true && (
                        <>
                          ✅ {pesos(v.totales.entradas.extraido)} /{' '}
                          {pesos(v.totales.salidas.extraido)}
                        </>
                      )}
                      {v.totales?.ok === false && (
                        <span className="text-red-800">
                          ❌ entradas {pesos(v.totales.entradas.extraido)} contra{' '}
                          {pesos(v.totales.entradas.declarado)} · salidas{' '}
                          {pesos(v.totales.salidas.extraido)} contra{' '}
                          {pesos(v.totales.salidas.declarado)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!cuadra && (
            <p className="mt-2 text-red-800">
              No se puede importar hasta que cuadre. Lo más probable: el archivo está
              cortado, o falta una parte del período.
            </p>
          )}
        </div>
      )}

      {/*
        Nivel 3. Va en su propio recuadro y en ámbar, no en rojo, porque significa
        otra cosa: los datos están bien, falta un mes. Importar igual es válido.
      */}
      {cadena && (
        <div
          className={`mb-4 rounded-sm border p-4 text-sm ${
            cadena.ok ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
          }`}
        >
          {cadena.ok ? (
            <p className="text-brand-dark/75">
              ✅ <strong>La cadena cierra:</strong> el saldo final de cada resumen es el
              inicial del siguiente, en los {analisis.resumenes.length} archivos.
            </p>
          ) : (
            <>
              <p className="font-bold text-brand-dark mb-1">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" />
                Falta al menos un resumen en el medio
              </p>
              <ul className="space-y-1 text-brand-dark/75">
                {cadena.huecos.map((h) => (
                  <li key={h.entre.join('→')}>
                    Entre <strong>{h.entre[0]}</strong> y <strong>{h.entre[1]}</strong>: uno
                    cierra en {pesos(h.cierra)} y el otro abre en {pesos(h.abre)} —{' '}
                    <strong>{pesos(Math.abs(h.diferencia))}</strong> sin explicar.
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-brand-dark/75">
                Se puede importar igual: lo que hay está bien, pero la rendición va a quedar
                incompleta hasta que subas el período que falta.
              </p>
            </>
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
            {anteriores.size > 0 && (
              <span className="text-amber-700">
                <strong>{anteriores.size}</strong> anteriores al inicio del destino,
                destildados
              </span>
            )}
            {delDia.size > 0 && (
              <span className="text-amber-700">
                <strong>{delDia.size}</strong> del día del inicio: revisalos a mano
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
                  {variosArchivos && <th className="p-2">Resumen</th>}
                  <th className="p-2">Descripción</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/10">
                {analisis.filas.map((f) => {
                  const { yaEsta, bloqueada, entra } = estadoDe(f);
                  return (
                    <tr key={f.indice} className={entra ? '' : 'opacity-50'}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={entra}
                          disabled={bloqueada}
                          onChange={() => alternar(f)}
                          aria-label={`Incluir el movimiento ${f.descripcion}`}
                        />
                      </td>
                      <td className="p-2 tabular-nums whitespace-nowrap">{f.fecha ?? '—'}</td>
                      {variosArchivos && (
                        <td
                          className="p-2 text-xs text-brand-dark/50 max-w-[10rem] truncate"
                          title={f.archivo}
                        >
                          {f.archivo}
                        </td>
                      )}
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
                        {!bloqueada && anteriores.has(f.indice) && (
                          <span className="text-amber-700">Anterior al inicio de este destino</span>
                        )}
                        {!bloqueada && delDia.has(f.indice) && (
                          <span className="text-amber-700">
                            Del día del inicio: puede ser de la etapa anterior
                          </span>
                        )}
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
            {/*
              ⚠️ UN BOTÓN DESHABILITADO TIENE QUE DECIR POR QUÉ.
              Sin esto, el caso más común —el lote analizado y el destino todavía
              sin elegir— se ve idéntico a "la pantalla no anda": todo tildado, la
              verificación en verde y el botón apagado, sin nada que explique la
              diferencia. El motivo va acá y no en un toast porque un toast hay que
              provocarlo, y al botón deshabilitado no se le puede hacer click.
            */}
            {!destinoId && (
              <span className="text-xs text-amber-700 inline-flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Elegí el destino del lote para poder importar. Recién ahí se destilda solo
                lo anterior al inicio del destino.
              </span>
            )}
            {destinoId && !cuadra && (
              <span className="text-xs text-red-800 inline-flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                No se importa hasta que lo extraído cuadre con lo que declara el resumen.
              </span>
            )}
            {destinoId && cuadra && !aImportar.length && (
              <span className="text-xs text-amber-700 inline-flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                No queda ningún movimiento tildado.
              </span>
            )}
            {destinoId && cuadra && aImportar.length > 0 && (
              <span className="text-xs text-brand-dark/55 inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Los gastos entran sin publicar: se revisan y se publican después.
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default ImportarMovimientos;
