#!/usr/bin/env node
/**
 * Rebuild the slim Natural Earth countries file shipped with the package.
 *
 * Usage:
 *   node scripts/slim-countries.mjs [path/to/full.geojson]
 *
 * Output uses short property keys (`i` = ISO2, `n` = name), resolves FRA/NOR
 * edge cases at build time, and stores coordinates as integers ×10 (1 decimal).
 * Runtime expands coords back to degrees in `expandCountryFeatures`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(root, process.argv[2] ?? 'src/data/ne_110m_admin_0_countries.json');
const outputPath = resolve(root, 'src/data/ne_110m_admin_0_countries.json');

const INVALID = new Set(['', '-99', '-1', null, undefined]);
const ADM0_A3_TO_ISO2 = { FRA: 'FR', NOR: 'NO' };

function pick(...candidates) {
	for (const value of candidates) {
		if (typeof value === 'string' && !INVALID.has(value)) return value.toUpperCase();
	}
	return '';
}

function resolveIso(p) {
	const iso2 = pick(p.ISO_A2, p.WB_A2, p.i);
	if (iso2) return iso2;
	const iso3 = pick(p.ISO_A3, p.ADM0_A3, p.WB_A3, p.a3);
	return ADM0_A3_TO_ISO2[iso3] ?? iso3;
}

function resolveName(p) {
	return String(p.ADMIN ?? p.NAME ?? p.n ?? '');
}

/** Encode degrees → int ×10 (one decimal of precision). */
function encodeCoord(n) {
	return Math.round(Number(n) * 10);
}

function encodeCoords(coords) {
	if (typeof coords[0] === 'number') {
		return [encodeCoord(coords[0]), encodeCoord(coords[1])];
	}
	return coords.map(encodeCoords);
}

const src = JSON.parse(readFileSync(inputPath, 'utf8'));

function firstPoint(coords) {
	if (!Array.isArray(coords)) return null;
	if (typeof coords[0] === 'number' && typeof coords[1] === 'number') return coords;
	for (const c of coords) {
		const hit = firstPoint(c);
		if (hit) return hit;
	}
	return null;
}

const sample = firstPoint(src.features?.[0]?.geometry?.coordinates);
if (sample && Math.abs(sample[0]) > 180) {
	console.error('Input looks already packed (int×10 coords). Pass a full Natural Earth GeoJSON.');
	process.exit(1);
}

const features = (src.features ?? []).map((f) => {
	const p = f.properties ?? {};
	const i = resolveIso(p);
	const n = resolveName(p) || i;
	return {
		type: 'Feature',
		properties: { i, n },
		geometry: {
			type: f.geometry.type,
			coordinates: encodeCoords(f.geometry.coordinates),
		},
	};
});

const out = JSON.stringify({ type: 'FeatureCollection', features });
writeFileSync(outputPath, out);
console.log(`Wrote ${features.length} features → ${outputPath} (${out.length} bytes)`);
