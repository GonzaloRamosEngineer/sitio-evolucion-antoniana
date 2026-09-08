import React, { useState } from 'react';
import { ESTADOS_HISTORIAL, ESTADOS_MEMBRESIA, describirEstado } from '@/lib/estadosPago';

const tones = { ok: 'bg-green-50 text-green-800', curso: 'bg-blue-50 text-blue-800', atencion: 'bg-amber-50 text-amber-800', cerrado: 'bg-gray-100 text-gray-600', desconocido: 'bg-gray-100 text-gray-600' };

export default function AccountHistory({ donations, memberships, loading, error, onRetry }) {
  const [expanded, setExpanded] = useState(false);
  const items = [...donations.map(d => ({ ...d, kind: 'donation' })), ...memberships.map(m => ({ ...m, kind: 'membership' }))]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const visible = expanded ? items : items.slice(0, 5);
  return <section id="historial" className="scroll-mt-24 mt-8 rounded-2xl border border-gray-200 bg-white overflow-hidden">
    <div className="p-5 sm:p-6 border-b border-gray-100">
      <h2 className="text-xl text-brand-dark">Historial de aportes</h2>
      <p className="text-sm text-gray-600 mt-1">Consultá tus donaciones y el estado de tus suscripciones.</p>
    </div>
    {loading ? <p role="status" className="p-6 text-sm">Cargando movimientos…</p> : error ? <div role="alert" className="p-6 text-sm"><p>No pudimos cargar todos los movimientos.</p><button onClick={onRetry} className="min-h-[44px] font-semibold text-brand-primary underline">Volver a intentar</button></div> : <>
      <ul className="divide-y divide-gray-100">
        {visible.map(item => {
          const state = describirEstado(item.kind === 'membership' ? ESTADOS_MEMBRESIA : ESTADOS_HISTORIAL, item.status);
          return <li key={`${item.kind}-${item.id}`} className="p-5 sm:px-6">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0"><p className="font-semibold text-brand-dark">{item.kind === 'donation' ? 'Donación única' : 'Suscripción mensual'}</p><p className="text-sm text-gray-600 mt-1">{item.created_at ? new Date(item.created_at).toLocaleDateString('es-AR') : 'Fecha no disponible'}</p></div>
              <div className="text-right shrink-0"><p className="font-bold text-brand-dark">${Number(item.amount).toLocaleString('es-AR')} <span className="text-xs font-normal">ARS</span></p><span className={`inline-block mt-1 px-2 py-1 rounded-md text-xs font-semibold ${tones[state.tono]}`}>{state.label}</span></div>
            </div>
            <details className="mt-2 text-sm text-gray-600"><summary className="cursor-pointer min-h-[44px] flex items-center underline underline-offset-4">Ver referencia de pago</summary><p className="break-all pb-2">Mercado Pago: {item.payment_id || item.preapproval_id || 'Referencia pendiente'}</p></details>
          </li>;
        })}
      </ul>
      {!items.length && <p className="p-6 text-sm text-gray-600">Todavía no tenés movimientos registrados.</p>}
      {items.length > 5 && <div className="p-4 border-t border-gray-100"><button type="button" className="w-full min-h-[44px] rounded-lg bg-brand-sand text-brand-primary font-semibold text-sm" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Mostrar menos' : `Ver todos los movimientos (${items.length})`}</button></div>}
    </>}
    <p className="p-5 bg-gray-50 text-sm text-gray-600">Los pagos se procesan en Mercado Pago. Una suscripción activa indica que el cobro mensual está habilitado; sus cobros pueden demorar en acreditarse.</p>
  </section>;
}
