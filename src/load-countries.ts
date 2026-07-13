import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import type { CountryProperties, GeoFeature, GeoGeometry } from './core/types.js';
import { isRecord } from './core/types.js';

export type CountriesTopology = Topology<{
	countries: GeometryCollection<{ i?: string; n?: string }>;
}>;

function isCountriesTopology(value: unknown): value is CountriesTopology {
	return isRecord(value) && value['type'] === 'Topology' && isRecord(value['objects']);
}

function toCountryProperties(value: unknown): CountryProperties {
	if (!isRecord(value)) return {};
	const out: CountryProperties = {};
	for (const [key, raw] of Object.entries(value)) {
		if (raw == null || typeof raw === 'string' || typeof raw === 'number') {
			out[key] = raw;
		}
	}
	return out;
}

function toGeoGeometry(value: unknown): GeoGeometry | undefined {
	if (!isRecord(value) || typeof value['type'] !== 'string') return undefined;
	return {
		type: value['type'],
		coordinates: value['coordinates'],
	};
}

/**
 * Expand a shipped countries Topology into GeoJSON features for globe.gl.
 * Coordinates are degrees (TopoJSON quantization is reversed by topojson-client).
 */
export function featuresFromTopology(topology: CountriesTopology): GeoFeature[] {
	const object = topology.objects?.countries;
	if (!object) return [];

	const collection = feature(topology, object);
	if (collection.type !== 'FeatureCollection') return [];

	return collection.features.map((f): GeoFeature => {
		const geometry = toGeoGeometry(f.geometry);
		const properties = toCountryProperties(f.properties);
		return geometry
			? { type: 'Feature', properties, geometry }
			: { type: 'Feature', properties };
	});
}

/**
 * Load country features. With no argument the packaged topology is pulled in
 * via dynamic `import()` — every bundler code-splits it into a lazy chunk with
 * zero consumer configuration (no asset-copy step, no URL resolution). Pass
 * `url` to fetch a custom topology instead (see `config.globe.topologyUrl`).
 */
export async function loadCountryFeatures(url?: string): Promise<GeoFeature[]> {
	if (!url) {
		const mod: { default: unknown } = await import('./data/ne_110m_admin_0_countries.json');
		const topology = mod.default;
		if (!isCountriesTopology(topology)) {
			throw new Error('Packaged country map is not TopoJSON');
		}
		return featuresFromTopology(topology);
	}
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Country map asset failed to load (${res.status})`);
	}
	const topology: unknown = await res.json();
	if (!isCountriesTopology(topology)) {
		throw new Error('Country map asset is not TopoJSON');
	}
	return featuresFromTopology(topology);
}
