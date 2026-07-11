import type { CountryProperties, GeoFeature, GeoGeometry } from './types.js';

const INVALID_ISO = new Set(['', '-99', '-1']);
const ADM0_A3_TO_ISO2: Readonly<Record<string, string>> = {
	FRA: 'FR',
	NOR: 'NO',
};

export function pickIso(...candidates: unknown[]): string {
	for (const value of candidates) {
		if (typeof value === 'string' && !INVALID_ISO.has(value)) return value.toUpperCase();
	}
	return '';
}

export function isoOf(feature: GeoFeature): string {
	const p: CountryProperties = feature.properties;
	const iso2 = pickIso(p.i, p.ISO_A2, p.WB_A2);
	if (iso2) return iso2;

	const iso3 = pickIso(p.ISO_A3, p.ADM0_A3, p.WB_A3);
	return ADM0_A3_TO_ISO2[iso3] ?? iso3;
}

export function featureName(feature: GeoFeature, fallbackIso: string): string {
	const p: CountryProperties = feature.properties;
	return String(p.n ?? p.ADMIN ?? p.NAME ?? fallbackIso);
}

function isLonLatPair(coords: unknown): coords is [number, number] {
	return (
		Array.isArray(coords) &&
		typeof coords[0] === 'number' &&
		typeof coords[1] === 'number'
	);
}

/** Prefer the largest polygon's bbox center (overseas territories / antimeridian). */
export function boundingBoxCenter(
	geometry: GeoGeometry | undefined,
): { lat: number; lng: number } | null {
	if (!geometry) return null;

	const polygons: unknown[] =
		geometry.type === 'Polygon'
			? [geometry.coordinates]
			: geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)
				? geometry.coordinates
				: [];

	if (!polygons.length) return null;

	let best: { lat: number; lng: number; area: number } | null = null;

	for (const polygon of polygons) {
		const points: [number, number][] = [];
		const flatten = (coords: unknown) => {
			if (!Array.isArray(coords)) return;
			if (isLonLatPair(coords)) {
				points.push([coords[0], coords[1]]);
				return;
			}
			for (const c of coords) flatten(c);
		};
		flatten(polygon);
		if (!points.length) continue;

		const lngs = points.map((p) => p[0]);
		const lats = points.map((p) => p[1]);
		const minLng = Math.min(...lngs);
		const maxLng = Math.max(...lngs);
		const minLat = Math.min(...lats);
		const maxLat = Math.max(...lats);
		const area = Math.abs(maxLng - minLng) * Math.abs(maxLat - minLat);
		if (!best || area > best.area) {
			best = { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2, area };
		}
	}

	return best ? { lat: best.lat, lng: best.lng } : null;
}

/**
 * Packed country GeoJSON stores lon/lat as integers ×10 (1 decimal).
 * Expand once after import so globe.gl / bbox math use degrees.
 */
export function expandCountryFeatures(features: GeoFeature[]): GeoFeature[] {
	if (!features.length) return features;
	const sample = firstPoint(features[0]?.geometry?.coordinates);
	const packed = sample != null && Math.abs(sample[0]) > 180;
	if (!packed) return features;

	return features.map((f) => {
		if (!f.geometry) return { ...f };
		return {
			...f,
			geometry: {
				type: f.geometry.type,
				coordinates: decodeCoords(f.geometry.coordinates),
			},
		};
	});
}

function firstPoint(coords: unknown): [number, number] | null {
	if (!Array.isArray(coords)) return null;
	if (isLonLatPair(coords)) {
		return [coords[0], coords[1]];
	}
	for (const c of coords) {
		const hit = firstPoint(c);
		if (hit) return hit;
	}
	return null;
}

function decodeCoords(coords: unknown): unknown {
	if (!Array.isArray(coords)) return coords;
	if (isLonLatPair(coords)) {
		return [coords[0] / 10, coords[1] / 10];
	}
	return coords.map(decodeCoords);
}
