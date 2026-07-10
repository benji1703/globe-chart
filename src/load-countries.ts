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

/** Dynamic import of the packaged TopoJSON asset. */
export async function loadCountryFeatures(): Promise<GeoFeature[]> {
	const mod = await import('./data/ne_110m_admin_0_countries.json');
	const raw = mod as unknown as CountriesTopology & { default?: CountriesTopology };
	const topology = raw.default ?? raw;
	if (!topology || topology.type !== 'Topology') {
		throw new Error('Country map asset is not TopoJSON');
	}
	return featuresFromTopology(topology);
}
