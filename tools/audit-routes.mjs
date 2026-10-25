#!/usr/bin/env node
import { auditRoutes, CURRENT_ROUTE_BASELINE } from './route-audit-lib.mjs';

const report = auditRoutes();
const failures = [
  ...report.missingFromBaseline.map((path) => `Ruta de App.jsx sin clasificar: ${path}`),
  ...report.missingFromApp.map((path) => `Ruta de la línea base ausente en App.jsx: ${path}`),
  ...report.duplicateAppRoutes.map((path) => `Ruta duplicada en App.jsx: ${path}`),
  ...report.duplicateBaselineRoutes.map((path) => `Ruta duplicada en la línea base: ${path}`),
  ...report.brokenTargets.map(
    ({ file, kind, target }) => `Destino estático inexistente (${kind}) ${target} en ${file}`,
  ),
];

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify({ routes: CURRENT_ROUTE_BASELINE, report }, null, 2)}\n`);
} else {
  const bySurface = Object.entries(
    Object.groupBy(CURRENT_ROUTE_BASELINE, ({ surface }) => surface),
  )
    .map(([surface, routes]) => `${surface}: ${routes.length}`)
    .join(', ');

  console.log(`Rutas declaradas: ${report.appRoutes.length}`);
  console.log(`Destinos internos estáticos verificados: ${report.staticTargets.length}`);
  console.log(`Clasificación: ${bySurface}`);
}

if (failures.length > 0) {
  console.error('\nLa auditoría de rutas encontró problemas:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else if (!process.argv.includes('--json')) {
  console.log('Resultado: línea base consistente, sin destinos estáticos huérfanos.');
}
