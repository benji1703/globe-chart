/**
 * Build-time stand-in for `three/webgpu`.
 *
 * three-globe imports { WebGPURenderer, StorageInstancedBufferAttribute }
 * statically, but only reaches them through the heatmap layer's GPU-compute
 * path — a layer globe-chart never uses. Aliasing `three/webgpu` to this file
 * keeps ~600 kB (minified) of WebGPU renderer + node material code out of
 * the bundle.
 *
 * Bundler recipe (Vite):
 *   resolve: { alias: { 'three/webgpu': 'globe-chart/stubs/three-webgpu.js' } }
 */
export class WebGPURenderer {
	constructor() {
		throw new Error(
			"globe-chart stub: 'three/webgpu' was aliased out — the WebGPU compute path is not available.",
		);
	}
}

export class StorageInstancedBufferAttribute {
	constructor() {
		throw new Error(
			"globe-chart stub: 'three/webgpu' was aliased out — StorageInstancedBufferAttribute is not available.",
		);
	}
}
