// src/lib/logger.js
//
// Punto único de logging del cliente (ROADMAP 6.4).
//
// El ítem original decía "63 console.* sin gate → logger con no-op". Al llegar
// acá quedaban 40, y **todos son `error` o `warn`**: ni un solo `console.log` de
// depuración (F2 ya había centralizado los de la capa de datos). Eso cambia la
// decisión: silenciar los errores en producción no sería higiene, sería quedarse
// sin la única herramienta de soporte que hay hoy — cuando alguien reporta un
// problema, lo primero que se le pide es que abra la consola.
//
// Entonces:
//   * `debug` / `info` **sí** se anulan en producción. Hoy no hay ninguno, y así
//     el día que alguien agregue uno para depurar, no termina en el bundle.
//   * `warn` / `error` pasan siempre. Son excepcionales por definición: solo
//     aparecen cuando algo ya salió mal.
//
// El valor real de esta capa es ser **un solo lugar**: el día que se conecte un
// servicio de tracking (Sentry y compañía), se enchufa acá y no en 40 archivos.

const isProduction = import.meta.env?.PROD ?? false;

const noop = () => {};

export const logger = {
  /** Trazas de depuración. No llegan a producción. */
  debug: isProduction ? noop : (...args) => console.debug(...args),

  /** Información de contexto. No llega a producción. */
  info: isProduction ? noop : (...args) => console.info(...args),

  /** Algo raro pero recuperable. Se mantiene en producción. */
  warn: (...args) => console.warn(...args),

  /**
   * Algo falló. Se mantiene en producción a propósito.
   * Acá va el `captureException` cuando haya tracking de errores.
   */
  error: (...args) => console.error(...args),
};
