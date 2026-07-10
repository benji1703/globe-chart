import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import type { GeoFeature } from './types.js';

export type CountriesTopology = Topology<{
	countries: GeometryCollection<{ i?: string; n?: string }>;
}>;

/**
 * Expand a shipped countries Topology into GeoJSON features for globe.gl.
 * Coordinates are degrees (TopoJSON quantization is reversed by topojson-client).
 */
export function featuresFromTopology(topology: CountriesTopology): GeoFeature[] {
	const object = topology.objects?.countries;
	if (!object) return [];

	const collection = feature(topology, object);
	if (collection.type !== 'FeatureCollection') return [];

	return collection.features.map((f) => ({
		type: 'Feature' as const,
		properties: (f.properties ?? {}) as GeoFeature['properties'],
		geometry: f.geometry as GeoFeature['geometry'],
	}));
}

/**
 * Resolve the packaged TopoJSON URL without a static Vite asset import (lib mode
 * would otherwise inline it as a giant data: URL). The file is copied next to
 * the bundle at build time (`npm run build` / demo plugin).
 */
function countriesJsonUrl(): string {
	const file = ['ne_110m_admin_0_countries', 'json'].join('.');
	// Dev server: absolute path under /src/data (avoids Vite emitting a second hashed copy).
	if (import.meta.env?.DEV) {
		return `/src/data/${file}`;
	}
	// Production: JSON is copied beside this module (dist/ or demo/dist/assets/).
	return new URL(file, import.meta.url).href;
}

/** Load packaged TopoJSON via fetch (raw JSON asset). */
export async function loadCountryFeatures(): Promise<GeoFeature[]> {
	const res = await fetch(countriesJsonUrl());
	if (!res.ok) {
		throw new Error(`Country map asset failed to load (${res.status})`);
	}
	const topology = (await res.json()) as CountriesTopology;
	if (!topology || topology.type !== 'Topology') {
		throw new Error('Country map asset is not TopoJSON');
	}
	return featuresFromTopology(topology);
}
