import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

// Nota: acá vivían los plugins del editor visual de Hostinger Horizons
// (`plugins/visual-editor/`, 810 líneas, solo dev) y un `rollupOptions.external`
// con los paquetes de Babel que esos plugins usaban para parsear JSX.
// Eliminados en la Sesión H (ROADMAP 6.5): el scaffold no se usa desde que el
// proyecto se mantiene a mano, y marcar Babel como external en el build era
// arrastre de eso, no una necesidad de la app.

const logger = createLogger();
const loggerError = logger.error;

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
};

/**
 * Separación de vendors (ROADMAP 6.2).
 *
 * Antes todo iba a un solo chunk inicial de ~600 KB. El caso peor era
 * `framer-motion`: se importa de forma eager en `App.jsx` y se usa en 59
 * archivos, así que entraba entero en el bundle de arranque.
 *
 * **Se usa la forma de objeto, no una función `(id) => ...`, y eso es lo
 * importante acá.** El primer intento fue una función que clasificaba por
 * substring del path, y rompió la producción con
 * `Cannot read properties of undefined (reading 'forwardRef')`:
 * `react` y `react-dom` matcheaban, pero **`scheduler`** — del que depende
 * `react-dom` — no matcheaba ningún patrón y caía en el chunk principal. Eso
 * arma un ciclo entre chunks (`index → vendor-radix → vendor-react → index`),
 * y con un ciclo Radix corre su `React.forwardRef` de nivel de módulo antes de
 * que React esté inicializado.
 *
 * La forma de objeto no tiene ese problema: se declaran los paquetes de entrada
 * y **Rollup arrastra solo las dependencias transitivas** (`scheduler`,
 * `loose-envify`, `js-tokens`, `@remix-run/router`) al chunk que corresponde,
 * sin que haya que mantener a mano una lista que se desactualiza en silencio.
 *
 * Si se agrega un vendor acá, **verificar el sitio en un navegador**: este tipo
 * de fallo no lo detectan ni el build, ni el lint, ni los tests.
 */
const manualChunks = {
	'vendor-react': ['react', 'react-dom', 'react-router-dom'],
	'vendor-motion': ['framer-motion'],
	'vendor-supabase': ['@supabase/supabase-js'],
	'vendor-query': ['@tanstack/react-query'],
	'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
};

export default defineConfig({
	customLogger: logger,
	plugins: [react()],
	server: {
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			output: { manualChunks },
		},
	},
});
