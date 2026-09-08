# Mejoras de UI/UX mobile — 8 de septiembre de 2026

## Objetivo

Reducir el desplazamiento, mejorar la lectura y priorizar las acciones en las pantallas de colaboración, panel personal, rendición y carnet. Se mantienen la paleta institucional, las rutas del proyecto y las fuentes de datos existentes.

## Pantallas y componentes

| Pantalla | Cambios | Comportamientos preservados |
| --- | --- | --- |
| `/collaborate` | Selección entre una vez, cada mes y voluntariado; un formulario visible; montos rápidos; márgenes corregidos; textos y aviso de sesión más breves; información extensa desplegable; aclaración de pago único o recurrente. | Montos y destinos independientes por modalidad; conservación de valores al alternar; email opcional; atribución del aporte; email alternativo para el pago; checkout de Mercado Pago. |
| `/dashboard` | Cabecera y credencial compactas; accesos a suscripciones, actividades e historial; suscripciones finalizadas desplegables; historial en filas adaptables, con cinco movimientos iniciales y opción de ver todos; referencias de pago desplegables; métricas comunitarias secundarias. | Pausar, reanudar y cancelar; estados de pago centralizados; suscripción activa diferenciada de pago acreditado; consulta de actividades y enlace a calendario. |
| `/rendicion` | Resumen de destinos activos; importes ARS con dos decimales; “Saldo por rendir” y explicación; balances compactos; descripciones extensas desplegables; conceptos completos; estados de carga, error y reintento. | Agrupación por categoría ordenada por importe; gastos sin categoría al final; grupos de un movimiento abiertos; fecha de inicio de rendición; enlace a documentación oficial; indicación de comprobante sin exponer archivos. |
| `/carnet` | Identidad y estado destacados; datos esenciales en dos columnas; trayectoria y aportes desplegables; reloj identificado como hora actual; acceso al panel y al club; ayuda de uso; errores y reintentos. | Condición institucional separada del acceso; tolerancia explícita; vencimiento y antigüedad desde las consultas existentes; reloj en vivo sin anuncios cada segundo; vinculación de aportes existentes; canje en `/club`. |
| Navegación inferior mobile | “Donar” lleva a `/collaborate`; estado de página actual; contraste y áreas táctiles; espacio inferior seguro para dispositivos compatibles. | WhatsApp, actividades y perfil conservan sus destinos. |

## Integración con el remoto

El trabajo comenzó desde `e0824467`. Antes de publicar se incorporó `origin/master` en `cbc77b00`, que incluía funciones posteriores de rendición, club, autenticación y previews sociales. Los conflictos de `Rendicion.jsx` y `CarnetPage.jsx` se resolvieron conservando esas funciones y aplicando el nuevo diseño. No se sobrescribieron las mejoras remotas con las pantallas antiguas.

## Validación

- `npm run build`: correcto después de integrar el remoto.
- `npm run lint`: cero errores, 39 advertencias de código sin usar y otros avisos existentes.
- `npm test`: 494 pruebas aprobadas en 41 archivos después de la integración.
- `git diff --check`: sin errores de espacios.
- Revisión visual local de colaboración, rendición y carnet a 320 y 390 px sin desbordes horizontales; revisión de carnet con sesión iniciada y de su distribución en escritorio.
- Interacciones verificadas: cambiar la modalidad conservando el monto, desplegar gastos y trayectoria; regresiones automatizadas para navegación de donación, historial, carga y error de rendición, tolerancia, suspensión institucional y reloj del carnet.
- No se ejecutaron cobros, cancelaciones ni canjes reales para probar el diseño.

## Publicación y seguimiento

El repositorio publica automáticamente en Vercel al pushear `master`. La publicación debe verificarse con el estado Vercel del commit enviado y con los recursos servidos por el dominio de producción; un push exitoso por sí solo no confirma el deploy.

Este cambio de UI no requiere migraciones de base de datos, cambios de variables de entorno ni un despliegue adicional de Edge Functions. Las funciones y migraciones que llegaron desde el remoto pertenecen a sus cambios anteriores.
