// src/components/Collaborate/SelectorDestino.jsx
//
// Elegir a dónde va el aporte (ROADMAP §10.7, §10.9).
//
// Hasta acá la plata entraba y el sistema no sabía para qué. Este es el punto
// donde el aportante lo dice, que es la única forma de que después haya algo
// que rendir. Tres decisiones que no son cosméticas:
//
//  1. Con UN solo destino no se muestra un desplegable de una sola opción: se
//     muestra la frase "Tu aporte va a X". Un select con un único ítem no es
//     una elección, es ruido — y ese es justo el estado en el que arranca toda
//     entidad nueva, que solo tiene el destino institucional.
//
//  2. Si no hay ningún destino, el componente no renderiza NADA y el aporte
//     sigue funcionando igual que antes. Una función nueva no puede bloquear
//     el cobro: la base ya garantiza que todo aporte tenga destino
//     (`aportes.destino_id` es NOT NULL, con caída al institucional), así que
//     defenderlo acá a costa de perder una donación sería un mal negocio.
//
//  3. La barra de progreso sale de `destinos.monto_recaudado`, que mantiene un
//     trigger. Nunca se consulta `aportes`: esa tabla tiene el nombre, el mail
//     y el monto de cada persona, y después de la fuga de las vistas
//     (20260816120000) la regla es que no se expone ni siquiera agregada.
import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

const SelectorDestino = ({ id, destinos = [], value, onChange, label = 'Tu aporte va a' }) => {
  if (destinos.length === 0) return null;

  const elegido = destinos.find((d) => d.id === value) ?? null;

  // Solo tiene sentido mostrar avance si hay contra qué medirlo.
  const meta = Number(elegido?.meta_monto) || 0;
  const recaudado = Number(elegido?.monto_recaudado) || 0;
  const avance = meta > 0 ? Math.min(100, Math.round((recaudado / meta) * 100)) : null;

  return (
    <div>
      {destinos.length === 1 && elegido ? (
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-brand-dark">{label}:</span>{' '}
          <span className="font-semibold text-brand-primary">{elegido.nombre}</span>
        </p>
      ) : (
        <>
          <Label htmlFor={id} className="text-brand-dark font-semibold">{label}</Label>
          <Select value={value ?? ''} onValueChange={onChange}>
            <SelectTrigger
              id={id}
              className="mt-1 w-full bg-gray-50 border-gray-200 text-brand-dark focus:ring-brand-primary focus:border-brand-primary rounded-xl h-12"
            >
              <SelectValue placeholder="Elegí un destino" />
            </SelectTrigger>

            <SelectContent className="bg-white border-gray-100">
              {destinos.map((d) => (
                <SelectItem
                  key={d.id}
                  value={d.id}
                  className="hover:bg-gray-50 cursor-pointer py-3"
                >
                  {d.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {elegido?.descripcion && (
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">{elegido.descripcion}</p>
      )}

      {avance !== null && (
        <div className="mt-3">
          {/* Barra a mano en vez de <Progress>: necesita los colores de marca en
              la parte llena, y el primitivo no deja llegar al indicador. */}
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={avance}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance de ${elegido.nombre}`}
          >
            <div
              className="h-full rounded-full bg-brand-gold transition-all duration-500 ease-out"
              style={{ width: `${avance}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 tabular-nums">
            {pesos(recaudado)} de {pesos(meta)} · {avance}%
          </p>
        </div>
      )}
    </div>
  );
};

export default SelectorDestino;
