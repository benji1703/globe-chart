import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	root: resolve(__dirname),
	base: './',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			// Custom element registration must not be tree-shaken.
			treeshake: {
				moduleSideEffects: true,
			},
		},
	},
	server: {
		port: 5173,
	},
});
