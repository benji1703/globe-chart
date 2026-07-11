import { describe, expect, it } from 'vitest';

import { computeLegendEntries, filterLegendEntriesByMode, hitsToLegendEntries } from './legend-entries.js';
import type { LegendSearchConfig } from './config.js';
import type { GeoFeature, LegendEntry, ThemeColors, ValueIndexResult } from './types.js';

const colors: ThemeColors = {
	ocean: '#000',
	empty: '#eee',
	low: '#f0c419',
	high: '#c62828',
	border: '#000',
	legendBg: '#fff',
	legendFg: '#000',
	legendMuted: '#666',
};

const features: GeoFeature[] = [
	{
		properties: { i: 'US', n: 'United States' },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-100, 30],
					[-90, 30],
					[-90, 40],
					[-100, 40],
					[-100, 30],
				],
			],
		},
	},
	{
		properties: { i: 'FR', n: 'France' },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[2, 46],
					[3, 46],
					[3, 47],
					[2, 47],
					[2, 46],
				],
			],
		},
	},
];

function makeIndex(): ValueIndexResult {
	return {
		valueMap: { US: 100, FR: 40 },
		rowByIso: { US: { iso: 'US', value: 100 }, FR: { iso: 'FR', value: 40 } },
		maxValue: 100,
		skipped: [],
		validCount: 2,
	};
}

describe('computeLegendEntries', () => {
	it('builds entries sorted by value descending, using feature bbox centers', () => {
		const entries = computeLegendEntries({
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(entries.map((e) => e.iso)).toEqual(['US', 'FR']);
		expect(entries[0]?.name).toBe('United States');
		expect(entries[0]?.lat).toBeCloseTo(35, 0);
	});

	it('skips values with no matching feature', () => {
		const entries = computeLegendEntries({
			index: {
				valueMap: { DE: 5 },
				rowByIso: { DE: { iso: 'DE', value: 5 } },
				maxValue: 5,
				skipped: [],
				validCount: 1,
			},
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(entries).toEqual([]);
	});
});

describe('hitsToLegendEntries', () => {
	it('maps remote hits to entries, preferring existing lat/lng when present', () => {
		const all = computeLegendEntries({
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		const mapped = hitsToLegendEntries([{ iso: 'fr', name: 'France (remote)' }], all, {
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(mapped).toHaveLength(1);
		expect(mapped[0]?.iso).toBe('FR');
		expect(mapped[0]?.name).toBe('France (remote)');
		expect(mapped[0]?.lat).toBeCloseTo(46.5, 1);
	});

	it('drops hits with no iso and no resolvable center', () => {
		const mapped = hitsToLegendEntries([{ iso: '' }, { iso: 'ZZ' }], [], {
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(mapped).toEqual([]);
	});
});

describe('filterLegendEntriesByMode', () => {
	const all: LegendEntry[] = [
		{ iso: 'US', name: 'United States', value: 100, color: '#f00', lat: 0, lng: 0 },
		{ iso: 'FR', name: 'France', value: 40, color: '#0f0', lat: 0, lng: 0 },
	];
	const entriesInput = { index: makeIndex(), colors, countryFeatures: features, nameField: 'name' };

	it('returns everything when search is disabled or query is empty', () => {
		const search: LegendSearchConfig = {
			enabled: false,
			mode: 'local',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		expect(filterLegendEntriesByMode({ all, query: 'fra', search, remoteHits: [], entriesInput })).toBe(all);
		expect(
			filterLegendEntriesByMode({
				all,
				query: '  ',
				search: { ...search, enabled: true },
				remoteHits: [],
				entriesInput,
			}),
		).toBe(all);
	});

	it('filters locally in local mode', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'local',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({ all, query: 'fra', search, remoteHits: [], entriesInput });
		expect(result.map((e) => e.iso)).toEqual(['FR']);
	});

	it('returns nothing in remote mode when there are no hits yet (no local fallback filtering)', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'remote',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({ all, query: 'fra', search, remoteHits: [], entriesInput });
		expect(result).toEqual([]);
	});

	it('returns remote hits once available in remote mode', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'remote',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({
			all,
			query: 'fra',
			search,
			remoteHits: [{ iso: 'FR', name: 'France (remote)' }],
			entriesInput,
		});
		expect(result.map((e) => e.iso)).toEqual(['FR']);
	});

	it('merges local and remote in hybrid mode', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'hybrid',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({
			all,
			query: 'fra',
			search,
			remoteHits: [{ iso: 'FR', name: 'France (remote)' }],
			entriesInput,
		});
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe('France (remote)');
	});
});
