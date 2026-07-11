import { describe, expect, it } from 'vitest';

import { mergeConfig, DEFAULT_CONFIG, normalizeCollapseOnSelect } from './config.js';
import { scaleColor } from './color-scale.js';
import { isoOf, pickIso, expandCountryFeatures, featureName } from './iso.js';
import { filterLegendEntries, mergeLegendByIso, paginateItems } from './legend-query.js';
import { createToastState, dismissToast, pushToast } from './toast.js';
import type { LegendEntry } from './types.js';
import { buildValueIndex, parseDataRows } from './value-index.js';

describe('mergeConfig', () => {
	it('returns defaults for nullish input', () => {
		const { config, invalid, unknownKeys } = mergeConfig(undefined);
		expect(invalid).toBe(false);
		expect(unknownKeys).toEqual([]);
		expect(config.legend.title).toBe(DEFAULT_CONFIG.legend.title);
		expect(config.legend.search.enabled).toBe(false);
		expect(config.legend.pageSize).toBe(0);
		expect(config.legend.maxHeight).toBe('min(360px, calc(100% - 24px))');
		expect(config.legend.collapsible).toBe(true);
		expect(config.legend.collapseMode).toBe('mobile');
		expect(config.legend.collapseOnSelect).toBe('mobile');
	});

	it('deep-merges legend search and camera', () => {
		const { config } = mergeConfig({
			legend: {
				title: 'Sales',
				pageSize: 10,
				maxHeight: '240px',
				search: { enabled: true, mode: 'remote' },
			},
			camera: { jumpAltitude: 2, initial: { lat: 10 } },
		});
		expect(config.legend.title).toBe('Sales');
		expect(config.legend.pageSize).toBe(10);
		expect(config.legend.maxHeight).toBe('240px');
		expect(config.legend.search.enabled).toBe(true);
		expect(config.legend.search.mode).toBe('remote');
		expect(config.legend.search.placeholder).toBe(DEFAULT_CONFIG.legend.search.placeholder);
		expect(config.camera.jumpAltitude).toBe(2);
		expect(config.camera.initial.lat).toBe(10);
	});

	it('flags invalid shapes and unknown keys', () => {
		expect(mergeConfig('nope').invalid).toBe(true);
		const { unknownKeys } = mergeConfig({ legend: { title: 'X' }, foo: 1 });
		expect(unknownKeys).toContain('foo');
	});

	it('records invalid nested values without crashing', () => {
		const { config, invalidPaths } = mergeConfig({
			legend: {
				pageSize: '10' as unknown as number,
				collapseMode: 'nope' as 'mobile',
				search: { mode: 'bogus' as 'local' },
			},
			toasts: { position: 'middle' as 'bottom-end' },
		});
		expect(config.legend.pageSize).toBe(DEFAULT_CONFIG.legend.pageSize);
		expect(config.legend.collapseMode).toBe(DEFAULT_CONFIG.legend.collapseMode);
		expect(config.legend.search.mode).toBe(DEFAULT_CONFIG.legend.search.mode);
		expect(config.toasts.position).toBe(DEFAULT_CONFIG.toasts.position);
		expect(invalidPaths).toEqual(
			expect.arrayContaining([
				'legend.pageSize',
				'legend.collapseMode',
				'legend.search.mode',
				'toasts.position',
			]),
		);
	});
});

describe('normalizeCollapseOnSelect', () => {
	it('maps booleans and valid strings', () => {
		expect(normalizeCollapseOnSelect(true)).toBe('always');
		expect(normalizeCollapseOnSelect(false)).toBe('never');
		expect(normalizeCollapseOnSelect('mobile')).toBe('mobile');
		expect(normalizeCollapseOnSelect('nope' as 'mobile')).toBe('mobile');
	});
});

describe('legend-query', () => {
	const sample: LegendEntry[] = [
		{ iso: 'US', name: 'United States', value: 10, color: '#f00', lat: 0, lng: 0 },
		{ iso: 'FR', name: 'France', value: 5, color: '#0f0', lat: 0, lng: 0 },
		{ iso: 'DE', name: 'Germany', value: 8, color: '#00f', lat: 0, lng: 0 },
	];

	it('filters by name and iso', () => {
		expect(filterLegendEntries(sample, 'fran').map((e) => e.iso)).toEqual(['FR']);
		expect(filterLegendEntries(sample, 'de').map((e) => e.iso)).toEqual(['DE']);
	});

	it('paginates', () => {
		const page = paginateItems(sample, 2, 2);
		expect(page.items).toHaveLength(1);
		expect(page.page).toBe(2);
		expect(page.totalPages).toBe(2);
	});

	it('merges by iso preferring extra fields', () => {
		const merged = mergeLegendByIso(sample, [
			{ iso: 'FR', name: 'France (remote)', value: 99, color: '#111', lat: 1, lng: 2 },
		]);
		const fr = merged.find((e) => e.iso === 'FR');
		expect(fr?.name).toBe('France (remote)');
		expect(fr?.value).toBe(99);
		expect(merged[0]?.iso).toBe('FR');
	});
});

describe('parseDataRows', () => {
	it('accepts object rows and drops junk', () => {
		const parsed = parseDataRows([{ iso: 'US', value: 1 }, null, 'x', { iso: 'FR', value: 2 }]);
		expect(parsed.invalid).toBe(false);
		expect(parsed.dropped).toBe(2);
		expect(parsed.rows).toHaveLength(2);
	});

	it('flags non-arrays', () => {
		expect(parseDataRows({ iso: 'US' }).invalid).toBe(true);
		expect(parseDataRows({ iso: 'US' }).rows).toEqual([]);
	});
});

describe('buildValueIndex', () => {
	it('maps valid rows and skips bad ones', () => {
		const result = buildValueIndex({
			data: [
				{ iso: 'us', value: 10 },
				{ iso: '', value: 1 },
				{ iso: 'FR', value: 'bad' },
				{ iso: 'DE', value: 5 },
			],
			isoField: 'iso',
			valueField: 'value',
		});
		expect(result.valueMap).toEqual({ US: 10, DE: 5 });
		expect(result.validCount).toBe(2);
		expect(result.skipped).toHaveLength(2);
		expect(result.maxValue).toBe(10);
	});
});

describe('color-scale', () => {
	it('returns empty for zero and interpolates otherwise', () => {
		const colors = {
			ocean: '#000',
			empty: '#eee',
			low: '#f0c419',
			high: '#c62828',
			border: '#000',
			legendBg: '#fff',
			legendFg: '#000',
			legendMuted: '#666',
		};
		expect(scaleColor(0, 100, colors)).toBe('#eee');
		expect(scaleColor(100, 100, colors)).toMatch(/^#[0-9a-f]{6}$/i);
	});
});

describe('iso', () => {
	it('resolves Natural Earth -99 via ADM0_A3', () => {
		expect(pickIso('-99', 'FR')).toBe('FR');
		expect(
			isoOf({
				properties: { ISO_A2: '-99', ADM0_A3: 'FRA', ADMIN: 'France' },
			}),
		).toBe('FR');
	});

	it('reads compact i/n keys and expands packed coords', () => {
		expect(isoOf({ properties: { i: 'de', n: 'Germany' } })).toBe('DE');
		expect(featureName({ properties: { i: 'DE', n: 'Germany' } }, 'DE')).toBe('Germany');
		const packed = expandCountryFeatures([
			{
				properties: { i: 'AF', n: 'Afghanistan' },
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[612, 357],
							[620, 350],
							[612, 357],
						],
					],
				},
			},
		]);
		expect(packed[0]?.geometry?.coordinates).toEqual([
			[
				[61.2, 35.7],
				[62, 35],
				[61.2, 35.7],
			],
		]);
	});
});

describe('featuresFromTopology', () => {
	it('expands shipped TopoJSON into GeoJSON features', async () => {
		const { featuresFromTopology } = await import('../load-countries.js');
		const topology = await import('../data/ne_110m_admin_0_countries.json');
		const topo = 'default' in topology ? topology.default : topology;
		const features = featuresFromTopology(topo as Parameters<typeof featuresFromTopology>[0]);
		expect(features.length).toBe(177);
		const af = features.find((f) => f.properties.i === 'AF');
		expect(af?.properties.n).toBe('Afghanistan');
		const ring = af?.geometry?.coordinates;
		expect(Array.isArray(ring)).toBe(true);
		const first = Array.isArray(ring) && Array.isArray(ring[0]) ? ring[0][0] : undefined;
		const lng = Array.isArray(first) ? first[0] : undefined;
		expect(typeof lng === 'number' && lng > 60).toBe(true);
		expect(typeof lng === 'number' && lng < 70).toBe(true);
	});
});

describe('toast reducer', () => {
	it('pushes, caps visibility, and dismisses', () => {
		let state = createToastState();
		state = pushToast(state, {
			level: 'warning',
			title: 'A',
			body: 'a',
			maxVisible: 2,
		});
		state = pushToast(state, {
			level: 'warning',
			title: 'B',
			body: 'b',
			maxVisible: 2,
		});
		state = pushToast(state, {
			level: 'error',
			title: 'C',
			body: 'c',
			maxVisible: 2,
		});
		expect(state.items).toHaveLength(2);
		expect(state.items.map((t) => t.title)).toEqual(['B', 'C']);
		const firstId = state.items[0]?.id;
		expect(firstId).toBeDefined();
		state = dismissToast(state, firstId!);
		expect(state.items).toHaveLength(1);
	});

	it('honors once codes', () => {
		let state = createToastState();
		state = pushToast(state, {
			level: 'info',
			title: 'Empty',
			body: 'none',
			code: 'empty-data',
			once: true,
			maxVisible: 3,
		});
		state = pushToast(state, {
			level: 'info',
			title: 'Empty',
			body: 'none',
			code: 'empty-data',
			once: true,
			maxVisible: 3,
		});
		expect(state.items).toHaveLength(1);
	});
});
