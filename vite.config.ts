import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			formats: ['es'],
			fileName: 'globe-chart',
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
			],
			output: {
				assetFileNames: '[name][extname]',
			},
		},
	},
	test: {
		environment: 'jsdom',
	},
});
