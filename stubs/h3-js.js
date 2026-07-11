/**
 * Build-time stand-in for `h3-js`.
 *
 * three-globe imports { latLngToCell, cellToLatLng, cellToBoundary,
 * polygonToCells } for the hexbin and hexed-polygons layers, which
 * globe-chart never uses. Aliasing `h3-js` to this file drops the whole
 * H3 geospatial index from the bundle.
 *
 * Bundler recipe (Vite):
 *   resolve: { alias: { 'h3-js': 'globe-chart/stubs/h3-js.js' } }
 */
function stub(name) {
	return () => {
		throw new Error(
			`globe-chart stub: 'h3-js' was aliased out — ${name}() is not available.`,
		);
	};
}

export const latLngToCell = stub('latLngToCell');
export const cellToLatLng = stub('cellToLatLng');
export const cellToBoundary = stub('cellToBoundary');
export const polygonToCells = stub('polygonToCells');
