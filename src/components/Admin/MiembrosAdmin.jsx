// src/components/Admin/MiembrosAdmin.jsx
//
// El padrón: quién es miembro de la entidad (ROADMAP §10.1.a, fase 4).
//
// Tres decisiones de esta pantalla que no son cosméticas:
//
//  1. **No hay botón de borrar, y tampoco de "crear miembro".** El alta la da
//     el primer aporte que otorga acceso (trigger `trg_miembro_desde_aporte`) o
//     una solicitud aprobada, según `reglas_membresia.modo_alta`. Un botón de
//     alta manual acá sería una cuarta forma de entrar al padrón que ninguna
//     regla contempla, y el número de miembro dejaría de significar algo.
//
//  2. **Suspender NO es lo mismo que estar atrasado en el pago**, y la pantalla
//     lo dice en voz alta. Es la separación de §10.2: el estado institucional y
//     el acceso a beneficios son dos columnas distintas y esta pantalla toca
//     solo la primera. Si esta entidad tiene `suspension_corta_acceso = true`,
//     el aviso lo advierte antes de confirmar — quitarle los beneficios a
//     alguien no puede ser un efecto lateral que se descubre después.
//
//  3. **El cambio de estado va por RPC y no por UPDATE directo.**
//     `cambiar_estado_miembro()` mantiene la coherencia de `fecha_baja` (que un
//     CHECK exige) y aplica la política de renumeración al reingresar. Un
//     `.update({ estado })` desde acá pasaría la policy de comisión y dejaría
//     la fila inconsistente.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { IdCard, Loader2, AlertTriangle, Ban, RotateCcw, UserMinus, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { usePadron, useReglasMembresia, useHuellasSinCuenta } from '@/hooks/useContentQueries';
import { cambiarEstadoMiembro } from '@/api/miembroApi';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import useSearch from '@/components/Admin/shared/useSearch';
import { figuraPlural, Figura } from '@/lib/miembro';

const TONO_ESTADO = {
  activo: 'bg-green-100 text-green-800',
  pendiente: 'bg-amber-100 text-amber-800',
  suspendido: 'bg-orange-100 text-orange-800',
  baja: 'bg-gray-200 text-gray-700',
};

/**
 * Las acciones posibles DESDE cada estado. Se declaran como dato y no como
 * cadenas de ternarios en el JSX para que agregar un estado sea una entrada más
 * y no una rama suelta en cuatro lugares — el mismo criterio que `ESTADOS` en
 * `CarnetPage`.
 */
const ACCIONES = {
  activo: [
    { estado: 'suspendido', label: 'Suspender', icono: Ban, pideMotivo: true },
    { estado: 'baja', label: 'Dar de baja', icono: UserMinus, pideMotivo: true },
  ],
  pendiente: [
    { estado: 'activo', label: 'Aprobar', icono: RotateCcw, pideMotivo: false },
    { estado: 'baja', label: 'Rechazar', icono: UserMinus, pideMotivo: true },
  ],
  suspendido: [
    { estado: 'activo', label: 'Rehabilitar', icono: RotateCcw, pideMotivo: false },
    { estado: 'baja', label: 'Dar de baja', icono: UserMinus, pideMotivo: true },
  ],
  baja: [{ estado: 'activo', label: 'Reincorporar', icono: RotateCcw, pideMotivo: false }],
};

const MiembrosAdmin = () => {
  const queryClient = useQueryClient();
  const { data: padron = [], isPending } = usePadron();
  const { data: reglas } = useReglasMembresia();
  const { data: sinCuenta = [] } = useHuellasSinCuenta();

  const [accion, setAccion] = useState(null); // { miembro, estado, label, pideMotivo }
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  // `useSearch` recibe RUTAS de campo (soporta 'a.b'), no un extractor.
  const { query, setQuery, filtered } = useSearch(padron, [
    'numero',
    'estado',
    'users.name',
    'users.email',
  ]);

  const conteos = useMemo(
    () =>
      padron.reduce((acc, m) => {
        acc[m.estado] = (acc[m.estado] || 0) + 1;
        return acc;
      }, {}),
    [padron]
  );

  const confirmar = async () => {
    if (!accion) return;
    setGuardando(true);
    const { error } = await cambiarEstadoMiembro(
      accion.miembro.user_id,
      accion.estado,
      motivo.trim() || null
    );
    setGuardando(false);

    if (error) {
      toast({
        title: 'No se pudo cambiar el estado',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // El padrón Y el acceso: si esta entidad corta el acceso al suspender,
    // suspender acaba de cambiar las dos cosas.
    queryClient.invalidateQueries({ queryKey: queryKeys.padron });
    queryClient.invalidateQueries({ queryKey: ['acceso'] });

    toast({ title: `${accion.label}: listo` });
    setAccion(null);
    setMotivo('');
  };

  if (isPending) return <ListSkeleton />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        icon={IdCard}
        title={`Padrón de ${figuraPlural()}`}
        description={
          `La condición institucional de cada persona. Es distinta del acceso a ` +
          `beneficios: alguien puede estar al día con su aporte y suspendido, o en ` +
          `regla y con la cuota vencida.`
        }
      />

      {/* GENTE QUE EL SISTEMA NO RECONOCE — ROADMAP §10.1.c.
          Va ARRIBA del padrón y no al pie, y es deliberado: el padrón dice
          quiénes están, y este bloque dice **cuántos faltan**. Al 2026-09-05 el
          segundo número es siete veces el primero, y al pie nadie lo iba a ver.

          ⚠️ NO HAY BOTÓN DE "CONTACTAR A TODOS", y tampoco se listan los emails.
          Esa gente dejó su dirección en un formulario de preinscripción a un
          programa educativo; escribirle por otra cosa es una decisión de la
          entidad, no un botón que el software ofrece porque puede. */}
      {sinCuenta.length > 0 && (
        <div className="mb-6 rounded-sm border border-brand-gold/50 bg-brand-gold/10 p-5">
          <div className="flex items-start gap-3">
            <UserSearch className="h-5 w-5 flex-shrink-0 mt-0.5 text-brand-dark" />
            <div className="flex-1">
              <h3 className="font-poppins font-bold text-brand-dark leading-tight">
                Personas que dejaron su email y no tienen cuenta
              </h3>
              <p className="mt-1 text-sm text-brand-dark/65 leading-relaxed">
                El sistema no las reconoce. Si crean una cuenta con el mismo email, van a
                poder vincular lo que dejaron con un clic — pero nadie les avisó.
              </p>

              <ul className="mt-3 space-y-1.5">
                {sinCuenta.map((f) => {
                  // El número que sirve para decidir NO es el total: es cuántas
                  // personas no están todavía. Mostrar 160 cuando 4 ya tienen
                  // cuenta sobreestima el trabajo que falta.
                  const faltan = Number(f.total || 0) - Number(f.con_cuenta || 0);
                  return (
                    <li
                      key={f.tabla}
                      className="flex items-baseline justify-between gap-4 text-sm border-b border-brand-dark/10 pb-1.5 last:border-0"
                    >
                      <span className="text-brand-dark/70">
                        {f.etiqueta}
                        {f.desde && (
                          <span className="text-brand-dark/45"> · desde {f.desde}</span>
                        )}
                      </span>
                      <span className="font-medium text-brand-dark tabular-nums flex-shrink-0">
                        {faltan} sin cuenta
                        <span className="text-brand-dark/45 font-normal"> de {f.total}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(conteos).map(([estado, n]) => (
          <Badge key={estado} className={`${TONO_ESTADO[estado] || ''} capitalize`}>
            {estado}: {n}
          </Badge>
        ))}
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar por número, nombre o email…"
        count={filtered.length}
        countLabel={figuraPlural()}
      />

      {!filtered.length ? (
        <EmptyState
          icon={IdCard}
          title={padron.length ? 'Sin resultados' : 'El padrón está vacío'}
          description={
            padron.length
              ? 'Probá con otro término.'
              : `Todavía no hay ${figuraPlural()}. El alta la da el primer aporte que otorga acceso.`
          }
        />
      ) : (
        <div className="mt-4 rounded-sm border border-brand-dark/10 bg-white divide-y divide-brand-dark/10">
          {filtered.map((m) => (
            <div
              key={m.user_id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              <span className="font-mono text-sm text-brand-dark/60 tabular-nums w-16 flex-shrink-0">
                N° {m.numero}
              </span>

              <div className="flex-1 min-w-0">
                <span className="block font-medium text-brand-dark truncate">
                  {m.users?.name || '(sin nombre)'}
                </span>
                <span className="block text-sm text-brand-dark/55 truncate">{m.users?.email}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`${TONO_ESTADO[m.estado] || ''} capitalize`}>{m.estado}</Badge>
                <span className="text-xs text-brand-dark/45 hidden sm:inline">
                  desde {m.fecha_alta}
                </span>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {(ACCIONES[m.estado] || []).map((a) => (
                  <Button
                    key={a.estado}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccion({ miembro: m, ...a });
                      setMotivo('');
                    }}
                  >
                    <a.icono className="h-3.5 w-3.5 mr-1.5" />
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(accion)} onOpenChange={(v) => !v && setAccion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accion?.label} a {accion?.miembro?.users?.name || 'esta persona'}
            </DialogTitle>
            <DialogDescription>
              {Figura()} N° {accion?.miembro?.numero}.
            </DialogDescription>
          </DialogHeader>

          {/* El aviso que evita el efecto lateral sorpresa. Solo si esta entidad
              configuró que la suspensión corta el acceso — en la Fundación no lo
              hace, y decirlo igual sería asustar por algo que no va a pasar. */}
          {reglas?.suspension_corta_acceso && ['suspendido', 'baja'].includes(accion?.estado) && (
            <div className="flex items-start gap-2 rounded-sm border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Esta entidad tiene configurado que la suspensión <strong>también corta el acceso
                a beneficios</strong>. La persona va a dejar de poder canjear, aunque su aporte
                siga vigente.
              </span>
            </div>
          )}

          {accion?.pideMotivo && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (queda en el historial de la ficha)</Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: pedido de la persona, resolución de comisión…"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAccion(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="action" onClick={confirmar} disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MiembrosAdmin;
