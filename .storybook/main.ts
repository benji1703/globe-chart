import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/web-components-vite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const config: StorybookConfig = {
	stories: ['../stories/**/*.stories.ts'],
	addons: [],
	framework: {
		name: '@storybook/web-components-vite',
		options: {},
	},
	async viteFinal(viteConfig) {
		viteConfig.resolve ??= {};
		// Prevent Vite from serving two Lit module instances (story runtime vs.
		// component code) — a duplicate-module mismatch breaks ReactiveController
		// registration intermittently. Same dedupe demo/vite.config.ts already uses.
		viteConfig.resolve.dedupe = [
			...(viteConfig.resolve.dedupe ?? []),
			'lit',
			'lit-html',
			'lit-element',
			'@lit/reactive-element',
		];
		// Same dead-weight stubs demo/vite.config.ts uses: three-globe statically
		// imports WebGPU/TSL/H3 for layers globe-chart never touches.
		viteConfig.resolve.alias = {
			...(viteConfig.resolve.alias ?? {}),
			'three/webgpu': resolve(repoRoot, 'stubs/three-webgpu.js'),
			'three/tsl': resolve(repoRoot, 'stubs/three-tsl.js'),
			'h3-js': resolve(repoRoot, 'stubs/h3-js.js'),
		};
		// Static storybook builds fetch the country topology beside the built
		// chunks (same contract as dist/ and demo/dist/assets/) — copy it there.
		viteConfig.plugins = [
			...(viteConfig.plugins ?? []),
			{
				name: 'copy-countries-topojson',
				closeBundle() {
					const outDir = resolve(repoRoot, 'storybook-static/assets');
					mkdirSync(outDir, { recursive: true });
					copyFileSync(
						resolve(repoRoot, 'src/data/ne_110m_admin_0_countries.json'),
						resolve(outDir, 'ne_110m_admin_0_countries.json'),
					);
				},
			},
		];
		return viteConfig;
	},
};

export default config;
