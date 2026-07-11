import { describe, expect, it, vi } from 'vitest';

import { SearchController } from './search-controller.js';
import { mergeConfig } from '../core/config.js';
import type { LegendSearchHit } from '../core/config.js';

function makeHost() {
	const target = new EventTarget();
	return Object.assign(target, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('SearchController', () => {
	it('does nothing when search is disabled', () => {
		const host = makeHost();
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig().config,
			getLegendResults: () => null,
		});
		controller.onQueryInput('fra');
		expect(controller.query).toBe('fra');
		expect(controller.searching).toBe(false);
	});

	it('filters locally without a debounce delay when mode is local', () => {
		const host = makeHost();
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig({ legend: { search: { enabled: true, mode: 'local' } } }).config,
			getLegendResults: () => null,
		});
		controller.onQueryInput('fra');
		expect(controller.searching).toBe(false);
		expect(controller.effectiveHits()).toEqual([]);
	});

	it('debounces and calls the provider in remote mode, dispatching a legend-search event', async () => {
		vi.useFakeTimers();
		const host = makeHost();
		const events: CustomEvent[] = [];
		host.addEventListener('legend-search', (e) => events.push(e as CustomEvent));
		const hits: LegendSearchHit[] = [{ iso: 'DE', name: 'Germany' }];
		const provider = vi.fn().mockResolvedValue(hits);
		const controller = new SearchController({
			host,
			getConfig: () =>
				mergeConfig({ legend: { search: { enabled: true, mode: 'remote', debounceMs: 100, provider } } }).config,
			getLegendResults: () => null,
		});

		controller.onQueryInput('ger');
		expect(controller.searching).toBe(false); // not yet — still debouncing
		await vi.advanceTimersByTimeAsync(100);

		expect(provider).toHaveBeenCalledWith('ger', expect.anything());
		expect(events).toHaveLength(1);
		expect(controller.effectiveHits()).toEqual(hits);
		expect(controller.searching).toBe(false);
		vi.useRealTimers();
	});

	it('prefers host-driven legendResults over its own remote hits', () => {
		const host = makeHost();
		const external: LegendSearchHit[] = [{ iso: 'US' }];
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig({ legend: { search: { enabled: true, mode: 'remote' } } }).config,
			getLegendResults: () => external,
		});
		expect(controller.effectiveHits()).toBe(external);
	});

	it('onLegendResultsChanged clears the searching flag', () => {
		const host = makeHost();
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig().config,
			getLegendResults: () => [],
		});
		controller.onLegendResultsChanged();
		expect(controller.searching).toBe(false);
	});
});
