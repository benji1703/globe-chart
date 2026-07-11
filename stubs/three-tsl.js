/**
 * Build-time stand-in for `three/tsl`.
 *
 * three-globe does `import * as tsl from 'three/tsl'` and only dereferences
 * the namespace inside the heatmap layer's GPU-compute shader builder, which
 * globe-chart never invokes. The named exports below cover every symbol
 * three-globe destructures, so bundlers stay quiet.
 *
 * Bundler recipe (Vite):
 *   resolve: { alias: { 'three/tsl': 'globe-chart/stubs/three-tsl.js' } }
 */
function stub(name) {
	return () => {
		throw new Error(
			`globe-chart stub: 'three/tsl' was aliased out — ${name}() is not available.`,
		);
	};
}

export const Fn = stub('Fn');
export const If = stub('If');
export const uniform = stub('uniform');
export const storage = stub('storage');
export const float = stub('float');
export const instanceIndex = stub('instanceIndex');
export const Loop = stub('Loop');
export const sqrt = stub('sqrt');
export const sin = stub('sin');
export const cos = stub('cos');
export const asin = stub('asin');
export const exp = stub('exp');
export const negate = stub('negate');
