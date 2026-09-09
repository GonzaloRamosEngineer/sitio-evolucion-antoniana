/**
 * LA MATEMÁTICA DEL RECORTE CUADRADO (§10.23.e)
 * ---------------------------------------------------------------------------
 * Vive acá, pura y sin DOM, por el mismo motivo que `club-reglas.ts` y que
 * `importarMovimientos.js`: es lo que DECIDE qué pedazo de la foto termina
 * guardado, y una cuenta mal hecha acá no se ve en un test de humo — se ve en
 * la cara de alguien cortada al medio, después de subirla.
 *
 * EL MODELO. Hay un visor cuadrado de lado `V` (px de CSS) y una imagen de
 * `iw × ih` px. La imagen se pinta escalada por `escala` y desplazada por
 * `(ox, oy)`, que es la posición de su esquina superior izquierda respecto de
 * la del visor — por eso `ox`/`oy` son NEGATIVOS o cero: la imagen siempre es
 * más grande que el visor y asoma para afuera.
 *
 * La escala mínima es la de «cover»: la que hace que el lado corto de la
 * imagen mida exactamente `V`. Con menos, entraría fondo vacío en el recorte;
 * el zoom del usuario multiplica desde ahí y nunca baja de 1.
 *
 * ⚠️ `ox`/`oy` SE LIMITAN SIEMPRE, y no es cosmético: sin el límite se puede
 * arrastrar la imagen hasta que el visor quede parcialmente afuera y el
 * `drawImage` recibe un rectángulo fuente que se sale del bitmap. El canvas no
 * se queja: rellena con transparente, y eso en un WebP sobre fondo claro es
 * una franja gris al costado de la cara.
 */

/** El avatar se guarda a 512 px, igual que los dibujos por defecto del par. */
export const LADO_SALIDA = 512;

/** WebP: la mitad del peso de un JPEG a calidad equivalente, y lo soportan
 *  todos los navegadores que el proyecto tiene como objetivo. */
export const MIME_SALIDA = 'image/webp';
export const CALIDAD_SALIDA = 0.85;

/**
 * La escala mínima: la que hace que la imagen cubra el visor sin dejar hueco.
 * @returns {number} 0 si las medidas no sirven (imagen sin cargar todavía).
 */
export const escalaCover = (lado, iw, ih) => {
  if (!(lado > 0) || !(iw > 0) || !(ih > 0)) return 0;
  return Math.max(lado / iw, lado / ih);
};

/**
 * Deja `(ox, oy)` dentro del rango en el que la imagen todavía cubre el visor.
 * El rango es `[lado - tamañoEscalado, 0]` en cada eje; cuando la imagen mide
 * exactamente el visor, el rango se cierra en 0 y no hay nada que arrastrar.
 */
export const limitarOffset = ({ lado, iw, ih, escala, ox, oy }) => {
  const ancho = iw * escala;
  const alto = ih * escala;
  const entre = (v, min) => Math.min(0, Math.max(min, Number.isFinite(v) ? v : 0));
  return {
    ox: entre(ox, lado - ancho),
    oy: entre(oy, lado - alto),
  };
};

/**
 * El rectángulo de la IMAGEN ORIGINAL que se va a dibujar, en px de la imagen.
 * Es lo que `drawImage` necesita como `sx, sy, sw, sh`.
 *
 * @returns {{sx:number,sy:number,sw:number,sh:number}|null} `null` si las
 *   medidas no alcanzan para decidir nada — el llamador no debe inventar un
 *   recorte con datos a medias.
 */
export const rectoFuente = ({ lado, iw, ih, escala, ox, oy }) => {
  if (!(lado > 0) || !(iw > 0) || !(ih > 0) || !(escala > 0)) return null;

  const limitado = limitarOffset({ lado, iw, ih, escala, ox, oy });
  const sw = lado / escala;
  const sh = lado / escala;

  // El offset está en px de pantalla y el rectángulo en px de la imagen: hay
  // que dividir por la escala. Y va con signo cambiado porque `ox` mide cuánto
  // se corrió la imagen hacia la izquierda, que es cuánto del original queda
  // fuera del visor por ese lado.
  const sx = -limitado.ox / escala;
  const sy = -limitado.oy / escala;

  // Sujeción final por redondeo: con escalas irracionales `sx + sw` puede
  // pasarse del ancho por una fracción de píxel, y eso es una franja
  // transparente en el borde.
  return {
    sx: Math.max(0, Math.min(sx, iw - sw)),
    sy: Math.max(0, Math.min(sy, ih - sh)),
    sw: Math.min(sw, iw),
    sh: Math.min(sh, ih),
  };
};

/**
 * Reencuadra al cambiar el zoom **manteniendo el centro del visor**.
 *
 * Sin esto, al mover el zoom la imagen salta: si solo se cambia la escala y se
 * deja el offset viejo, el punto que queda en el centro del visor es otro, y en
 * la práctica se ve como que la foto se escapa hacia una esquina. Quien está
 * encuadrando su propia cara la pierde y tiene que volver a buscarla en cada
 * paso del deslizador.
 *
 * La cuenta: se averigua qué punto de la IMAGEN está hoy en el centro del
 * visor, y se despeja el offset que lo deja ahí con la escala nueva.
 */
export const reencuadrar = ({ lado, iw, ih, escala, ox, oy, escalaNueva }) => {
  if (!(escala > 0) || !(escalaNueva > 0)) return { ox, oy };

  const centroX = (-ox + lado / 2) / escala;
  const centroY = (-oy + lado / 2) / escala;

  return limitarOffset({
    lado,
    iw,
    ih,
    escala: escalaNueva,
    ox: lado / 2 - centroX * escalaNueva,
    oy: lado / 2 - centroY * escalaNueva,
  });
};

/**
 * El offset que deja la imagen centrada. Es el punto de partida al elegir un
 * archivo: nadie quiere que su foto arranque pegada a una esquina.
 */
export const offsetCentrado = ({ lado, iw, ih, escala }) => ({
  ox: (lado - iw * escala) / 2,
  oy: (lado - ih * escala) / 2,
});
