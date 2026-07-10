import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			formats: ['es'],
			fileName: 'globe-chart',
		},
		rollupOptions: {
			external: ['lit', 'globe.gl', 'three'],
		},
	},
	test: {
		environment: 'jsdom',
	},
});
