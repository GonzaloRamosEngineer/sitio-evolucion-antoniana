// Archivo generado desde src/config/entidad.js. No editar manualmente.
// Ejecutar `npm run sync:identity` después de modificar el contrato de entidad.

export const ENTIDAD = Object.freeze({
  nombre: "Fundación Evolución Antoniana",
  sitio: "https://www.evolucionantoniana.com",
  contactoEmail: "info@evolucionantoniana.com",
});

export const sitioEntidad = (override?: string | null) =>
  override?.trim().replace(/\/+$/, '') || ENTIDAD.sitio;

export const remitenteEntidad = (override?: string | null) => {
  const remitente = override?.trim();
  if (!remitente) return `${ENTIDAD.nombre} <${ENTIDAD.contactoEmail}>`;
  return remitente.includes('<') ? remitente : `${ENTIDAD.nombre} <${remitente}>`;
};
