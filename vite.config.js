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
 * Separarlo por librería mejora el cacheo entre deploys: cambiar código de la
 * app ya no invalida el chunk de React ni el de Supabase, que son los que menos
 * cambian. React y react-dom van **juntos** a propósito — separarlos rompe el
 * orden de inicialización.
 */
const manualChunks = (id) => {
	if (!id.includes('node_modules')) return undefined;

	if (id.includes('framer-motion')) return 'vendor-motion';
	if (id.includes('@supabase')) return 'vendor-supabase';
	if (id.includes('@tanstack')) return 'vendor-query';
	if (id.includes('@radix-ui')) return 'vendor-radix';
	if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
		return 'vendor-forms';
	}
	if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('react-router')) {
		return 'vendor-react';
	}

	return undefined;
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
