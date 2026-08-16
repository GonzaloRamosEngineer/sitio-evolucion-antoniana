// src/components/ui/resource-state.jsx
//
// Estados de "cargando" y "no encontrado" de las páginas de detalle
// (ROADMAP 6.6).
//
// Las tres páginas —novedad, beneficio, alianza— tenían su propia copia de los
// dos bloques. Eran estructuralmente iguales pero **visualmente distintas**: el
// loading de novedades era un punto de 4px con texto y los otros dos un círculo
// de 64px; el "no encontrado" de alianzas tenía tarjeta e ícono y los otros no.
// O sea que la duplicación no sólo repetía código, además producía tres
// experiencias distintas para la misma situación según por dónde entrara el
// visitante.
//
// Al unificar se tomó de cada uno lo mejor: el esqueleto de 64px (que era el de
// 2 de 3 y lee más como carga que el punto chico) y la tarjeta con ícono de
// alianzas (la más trabajada y la que sigue el lenguaje de la Sesión E:
// `rounded-sm`, borde `brand-dark/10`).
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Esqueleto de carga a pantalla completa.
 *
 * @param {string} title Título de pestaña mientras carga. Opcional: sin él no
 *   se renderiza `<Helmet>` y la pestaña conserva el título anterior.
 */
const ResourceLoading = ({ title }) => (
  <div className="min-h-screen bg-brand-sand flex items-center justify-center">
    {title && (
      <Helmet>
        <title>{title}</title>
      </Helmet>
    )}
    {/* `aria-live="polite"` + `role="status"`: sin esto un lector de pantalla no
        anuncia nada durante la carga y la página parece vacía. */}
    <div className="animate-pulse flex flex-col items-center" role="status" aria-live="polite">
      <div aria-hidden="true" className="h-16 w-16 bg-brand-primary/20 rounded-full mb-4 animate-bounce" />
      <div aria-hidden="true" className="h-4 w-32 bg-brand-primary/20 rounded" />
      <span className="sr-only">Cargando…</span>
    </div>
  </div>
);

/**
 * Pantalla de recurso inexistente, con salida al listado.
 *
 * @param {React.ElementType} icon        Ícono de lucide.
 * @param {string}            title       Encabezado (también título de pestaña).
 * @param {string}            description Por qué puede haber pasado.
 * @param {string}            backTo      Ruta del listado.
 * @param {string}            backLabel   Texto del botón de vuelta.
 */
const ResourceNotFound = ({ icon: Icon, title, description, backTo, backLabel }) => (
  <div className="min-h-screen bg-brand-sand flex flex-col items-center justify-center px-4">
    <Helmet>
      <title>{title} – Fundación Evolución Antoniana</title>
      {/* Es un callejón sin salida: que no se indexe. */}
      <meta name="robots" content="noindex" />
    </Helmet>
    <div className="max-w-md w-full bg-white rounded-sm p-8 text-center border border-brand-dark/10">
      {Icon && <Icon aria-hidden="true" className="w-12 h-12 text-brand-gold mx-auto mb-4" />}
      <h1 className="text-2xl font-bold font-poppins text-brand-dark mb-3">{title}</h1>
      <p className="text-gray-600 mb-6">{description}</p>
      <Link to={backTo}>
        <Button variant="outline">{backLabel}</Button>
      </Link>
    </div>
  </div>
);

export { ResourceLoading, ResourceNotFound };
