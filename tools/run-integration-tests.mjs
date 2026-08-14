// Corre los tests de integración contra la Supabase LOCAL (Docker).
//
// Lee las credenciales de `supabase status -o env` en vez de hardcodearlas (las
// keys locales son fijas por defecto, pero leerlas evita que el día que cambien
// los tests apunten a la nada... o peor, caigan al fallback de producción).
//
// Uso:  npx supabase start  &&  npm run test:integration
import { execSync, spawnSync } from 'node:child_process';

const parseEnv = (raw) => {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
};

let status;
try {
  status = parseEnv(execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch {
  console.error(
    '\n✖ No pude leer el estado de la Supabase local.\n' +
      '  Levantala primero con:  npx supabase start\n'
  );
  process.exit(1);
}

const url = status.API_URL;
const anonKey = status.ANON_KEY;
const serviceKey = status.SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error('\n✖ `supabase status` no devolvió API_URL/ANON_KEY. ¿Está corriendo el stack?\n');
  process.exit(1);
}

// Guardarraíl (el mismo que el del test): estos tests ESCRIBEN. Si la URL no es
// local, abortamos antes de arrancar vitest.
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(url)) {
  console.error(`\n✖ API_URL no es local ("${url}"). Abortando para no escribir en producción.\n`);
  process.exit(1);
}

console.log(`▸ Supabase local en ${url}`);
if (!serviceKey) {
  console.warn('▸ Sin SERVICE_ROLE_KEY: los tests que necesitan sembrar datos se van a saltear.');
}

const result = spawnSync(
  'npx',
  ['vitest', 'run', '--config', 'vitest.integration.config.js', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      SUPABASE_LOCAL_URL: url,
      SUPABASE_LOCAL_ANON_KEY: anonKey,
      SUPABASE_LOCAL_SERVICE_KEY: serviceKey ?? '',
    },
  }
);

process.exit(result.status ?? 1);
