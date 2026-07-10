#!/usr/bin/env node
/**
 * Rebuild the Natural Earth countries topology shipped with the package.
 *
 * Usage:
 *   node scripts/slim-countries.mjs [path/to/full-or-packed.geojson]
 *
 * Output is TopoJSON (shared arcs + quantization). Runtime expands to GeoJSON
 * features via topojson-client in `loadCountryFeatures`.
 *
 * Env:
 *   QUANTIZE=10000   topology quantization (default 1e4; try 1e3 for smaller)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topology } from 'topojson-server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(root, process.argv[2] ?? 'src/data/ne_110m_admin_0_countries.json');
const outputPath = resolve(root, 'src/data/ne_110m_admin_0_countries.json');
const QUANTIZE = Number(process.env.QUANTIZE ?? 1e4);

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

function firstPoint(coords) {
	if (!Array.isArray(coords)) return null;
	if (typeof coords[0] === 'number' && typeof coords[1] === 'number') return coords;
	for (const c of coords) {
		const hit = firstPoint(c);
		if (hit) return hit;
	}
	return null;
}

/** Packed GeoJSON used int×10 degrees; TopoJSON needs real lon/lat. */
function decodeCoords(coords) {
	if (!Array.isArray(coords)) return coords;
	if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
		return [coords[0] / 10, coords[1] / 10];
	}
	return coords.map(decodeCoords);
}

function asFeatureCollection(src) {
	if (src?.type === 'Topology' && src.objects) {
		console.error('Input is already TopoJSON. Pass GeoJSON (full Natural Earth or packed).');
		process.exit(1);
	}

	const featuresIn = src.features ?? [];
	const sample = firstPoint(featuresIn[0]?.geometry?.coordinates);
	const packed = sample != null && Math.abs(sample[0]) > 180;

	return {
		type: 'FeatureCollection',
		features: featuresIn.map((f) => {
			const p = f.properties ?? {};
			const i = resolveIso(p);
			const n = resolveName(p) || i;
			const coordinates = packed
				? decodeCoords(f.geometry.coordinates)
				: f.geometry.coordinates;
			return {
				type: 'Feature',
				properties: { i, n },
				geometry: { type: f.geometry.type, coordinates },
			};
		}),
	};
}

const src = JSON.parse(readFileSync(inputPath, 'utf8'));
const collection = asFeatureCollection(src);
const topo = topology({ countries: collection }, QUANTIZE);
const out = JSON.stringify(topo);
writeFileSync(outputPath, out);

const arcs = Array.isArray(topo.arcs) ? topo.arcs.length : 0;
console.log(
	`Wrote TopoJSON → ${outputPath} (${out.length} bytes, ${collection.features.length} countries, ${arcs} arcs, quantize=${QUANTIZE})`,
);
