import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HtmlTagDescriptor } from 'vite';
import { defineConfig } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, '..');

export default defineConfig({
	root,
	base: './',
	resolve: {
		// Prevent Vite from shipping two Lit copies (lit vs lit-html / reactive-element).
		dedupe: ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'],
		alias: {
			// three-globe statically imports the WebGPU renderer, TSL shader
			// language, and H3 index for layers globe-chart never uses
			// (heatmaps, hexbins). Stubbing them keeps that code out of the chunk.
			'three/webgpu': resolve(repoRoot, 'stubs/three-webgpu.js'),
			'three/tsl': resolve(repoRoot, 'stubs/three-tsl.js'),
			'h3-js': resolve(repoRoot, 'stubs/h3-js.js'),
		},
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
			// Start the heavy downloads at HTML parse time instead of after
			// main.ts executes: modulepreload the lazy globe chunks and the
			// code-split country topology chunk.
			name: 'preload-globe-chunks',
			enforce: 'post',
			transformIndexHtml(_html, ctx) {
				const bundle = ctx.bundle;
				if (!bundle) return;
				const tags: HtmlTagDescriptor[] = [];
				for (const [fileName, chunk] of Object.entries(bundle)) {
					if (chunk.type !== 'chunk') continue;
					if (
						/^assets\/(globe\.gl|three\.core|globe-chart|ne_110m_admin_0_countries)-/.test(
							fileName,
						)
					) {
						tags.push({
							tag: 'link',
							attrs: { rel: 'modulepreload', crossorigin: true, href: `./${fileName}` },
							injectTo: 'head',
						});
					}
				}
				return tags;
			},
		},
	],
	server: {
		port: 5173,
	},
});
