import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import type { CountryProperties, GeoFeature, GeoGeometry } from './types.js';
import { isRecord } from './types.js';

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
 * Resolve the packaged TopoJSON URL.
 * Path is built dynamically so Vite does not rewrite it into an inlined data: URL
 * (which blew the npm bundle past 170KB). The JSON is copied beside the built
 * module (`npm run build` / demo `closeBundle` plugin).
 */
function countriesJsonUrl(): string {
	const file = ['ne_110m_admin_0_countries', 'json'].join('.');
	// Dev: resolve next to this source module (…/src/data/…).
	// Prod: JSON sits beside the emitted JS (dist/ or demo/dist/assets/).
	if (import.meta.env?.DEV) {
		return new URL(`./data/${file}`, import.meta.url).href;
	}
	return new URL(file, import.meta.url).href;
}

/** Load packaged TopoJSON via fetch (raw JSON asset). */
export async function loadCountryFeatures(): Promise<GeoFeature[]> {
	const res = await fetch(countriesJsonUrl());
	if (!res.ok) {
		throw new Error(`Country map asset failed to load (${res.status})`);
	}
	const topology: unknown = await res.json();
	if (!isCountriesTopology(topology)) {
		throw new Error('Country map asset is not TopoJSON');
	}
	return featuresFromTopology(topology);
}
