import type { LegendSearchConfig, LegendSearchHit } from './config.js';
import { scaleColor } from './color-scale.js';
import { boundingBoxCenter, featureName, isoOf } from './iso.js';
import { filterLegendEntries, mergeLegendByIso } from './legend-query.js';
import type { GeoFeature, LegendEntry, ThemeColors, ValueIndexResult } from './types.js';
import { assertNever, definedProps } from './types.js';

export interface LegendEntriesInput {
	index: ValueIndexResult;
	colors: ThemeColors;
	countryFeatures: readonly GeoFeature[];
	nameField: string;
}

/** Full ranked legend from the current value index (unfiltered, sorted by value desc). */
export function computeLegendEntries(input: LegendEntriesInput): LegendEntry[] {
	const { index, colors, countryFeatures, nameField } = input;

	return Object.entries(index.valueMap)
		.map(([iso, value]): LegendEntry | null => {
			const feat = countryFeatures.find((f) => isoOf(f) === iso);
			const center = feat && boundingBoxCenter(feat.geometry);
			if (!feat || !center) return null;

			const row = index.rowByIso[iso];
			const nameFromRow = row && nameField in row ? String(row[nameField] ?? '') : '';

			return {
				iso,
				name: nameFromRow || featureName(feat, iso),
				value,
				color: scaleColor(value, index.maxValue, colors),
				lat: center.lat,
				lng: center.lng,
				...definedProps({ row }),
			};
		})
		.filter((entry): entry is LegendEntry => entry !== null)
		.sort((a, b) => b.value - a.value);
}

/** Map host-driven remote search hits (ISO + optional name/value) onto full legend entries. */
export function hitsToLegendEntries(
	hits: readonly LegendSearchHit[],
	all: readonly LegendEntry[],
	input: LegendEntriesInput,
): LegendEntry[] {
	const { index, colors, countryFeatures } = input;
	const byIso = new Map(all.map((e) => [e.iso, e]));
	const out: LegendEntry[] = [];

	for (const hit of hits) {
		const iso = String(hit.iso ?? '').toUpperCase();
		if (!iso) continue;
		const existing = byIso.get(iso);
		const value = hit.value ?? existing?.value ?? index.valueMap[iso] ?? 0;
		const feat = countryFeatures.find((f) => isoOf(f) === iso);
		const center = existing
			? { lat: existing.lat, lng: existing.lng }
			: feat
				? boundingBoxCenter(feat.geometry)
				: null;
		if (!center) continue;

		out.push({
			iso,
			name: hit.name || existing?.name || (feat ? featureName(feat, iso) : iso),
			value,
			color: scaleColor(value, index.maxValue, colors),
			lat: center.lat,
			lng: center.lng,
			...definedProps({ row: existing?.row ?? index.rowByIso[iso] }),
		});
	}

	return out.sort((a, b) => b.value - a.value);
}

export interface FilterLegendInput {
	all: LegendEntry[];
	query: string;
	search: LegendSearchConfig;
	remoteHits: readonly LegendSearchHit[];
	entriesInput: LegendEntriesInput;
}

/** Apply the configured search mode (local / remote / hybrid) to the full entry list. */
export function filterLegendEntriesByMode(input: FilterLegendInput): LegendEntry[] {
	const { all, search, remoteHits, entriesInput } = input;
	const query = input.query.trim();
	if (!search.enabled || !query) return all;

	const mode = search.mode;
	const local = mode === 'remote' ? [] : filterLegendEntries(all, query);
	const remoteEntries = mode === 'local' ? [] : hitsToLegendEntries(remoteHits, all, entriesInput);

	switch (mode) {
		case 'local':
			return local;
		case 'remote':
			return remoteEntries.length ? remoteEntries : local;
		case 'hybrid':
			return mergeLegendByIso(local, remoteEntries);
		default:
			return assertNever(mode);
	}
}
