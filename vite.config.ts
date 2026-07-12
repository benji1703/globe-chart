import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		lib: {
			entry: {
				'globe-chart': resolve(__dirname, 'src/index.ts'),
				react: resolve(__dirname, 'src/react.ts'),
			},
			formats: ['es'],
		},
		assetsInlineLimit: (filePath: string) => {
			// Never data-URL the country topology — keep a real fetchable asset.
			if (filePath.includes('ne_110m_admin_0_countries')) return false;
			return undefined;
		},
		rollupOptions: {
			// Keep lit subpaths + topojson-client external so they are not inlined.
			external: [
				'lit',
				/^lit\//,
				'globe.gl',
				'three',
				'topojson-client',
				'react',
				/^react\//,
				'@lit/react',
			],
			output: {
				assetFileNames: '[name][extname]',
				// Shared chunk stays in dist/ root (no hash, no subdir) — the countries
				// JSON is resolved relative to the chunk that contains load-countries.
				chunkFileNames: '[name]-internal.js',
			},
		},
	},
	test: {
		environment: 'jsdom',
	},
});
