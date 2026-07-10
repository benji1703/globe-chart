import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, '..');

export default defineConfig({
	root,
	base: './',
	resolve: {
		// Prevent Vite from shipping two Lit copies (lit vs lit-html / reactive-element).
		dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
	},
	optimizeDeps: {
		include: ['lit', 'lit/decorators.js'],
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		modulePreload: { polyfill: true },
	},
	plugins: [
		{
			name: 'copy-countries-topojson',
			closeBundle() {
				const outDir = resolve(root, 'dist/assets');
				mkdirSync(outDir, { recursive: true });
				copyFileSync(
					resolve(repoRoot, 'src/data/ne_110m_admin_0_countries.json'),
					resolve(outDir, 'ne_110m_admin_0_countries.json'),
				);
			},
		},
	],
	server: {
		port: 5173,
	},
});
