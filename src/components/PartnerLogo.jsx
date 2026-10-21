import React from 'react';
import { cn } from '@/lib/utils';
import partnerLogoOverrides from '@/data/partnerLogoOverrides.json';

const getPartnerLogoSrc = (partner) =>
  partnerLogoOverrides[partner?.id] || partner?.logo_url || null;

/**
 * Los PNG normalizados viven en un lienzo Retina de 560×240 y se renderizan en
 * un máximo de 280×120 CSS. Mantener ese lienzo —en vez de estirar cada archivo
 * hasta el borde disponible— hace que wordmarks anchos, escudos y símbolos
 * cuadrados tengan una masa visual pareja y dos píxeles físicos por cada píxel
 * visual en la Home, el listado y el detalle. Los SVG conservan resolución
 * vectorial a cualquier escala.
 */
const PartnerLogo = ({ partner, className, imageClassName, fallbackClassName, loading = 'lazy' }) => {
  const src = getPartnerLogoSrc(partner);

  return (
    <span
      className={cn(
        'inline-flex h-[120px] w-[280px] max-w-full items-center justify-center',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={partner.nombre}
          width="280"
          height="120"
          loading={loading}
          decoding="async"
          className={cn('h-full w-full object-contain', imageClassName)}
        />
      ) : (
        <span
          className={cn(
            'font-poppins text-center text-sm font-semibold leading-snug text-brand-dark',
            fallbackClassName,
          )}
        >
          {partner.nombre}
        </span>
      )}
    </span>
  );
};

export default PartnerLogo;
