// Destinos públicos emitidos por Edge Functions.
// Se mantienen juntos para que emails e invitaciones no vuelvan a divergir
// del contrato canónico documentado en src/config/rutas.js.
export const RUTAS_EXTERNAS = Object.freeze({
  ACTUALIZAR_CLAVE: "/actualizar-clave",
  PANEL_COMERCIO: "/comercios/panel",
  CONFIRMAR_ASISTENCIA: "/actividades/confirmar-asistencia",
  COLABORAR: "/colaborar",
  CUENTA: "/mi/cuenta",
});

export const urlDelSitio = (origen: string, ruta: string) =>
  `${origen.replace(/\/+$/, "")}${ruta}`;
