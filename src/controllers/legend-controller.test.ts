import { describe, expect, it, vi } from 'vitest';

import { LegendController } from './legend-controller.js';
import { DEFAULT_CONFIG, mergeConfig } from '../core/config.js';
import type { LegendEntry } from '../core/types.js';

function makeHost() {
	return {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

const entry: LegendEntry = { iso: 'FR', name: 'France', value: 10, color: '#000', lat: 46, lng: 2 };

describe('LegendController', () => {
	it('select() sets selectedIso, invokes onSelect, and requests an update', () => {
		const host = makeHost();
		const onSelect = vi.fn();
		const controller = new LegendController({
			host,
			getConfig: () => mergeConfig().config,
			onSelect,
		});

		controller.select(entry);
		expect(controller.selectedIso).toBe('FR');
		expect(onSelect).toHaveBeenCalledWith(entry);
		expect(host.requestUpdate).toHaveBeenCalled();
	});

	it('setPage / toggle update state and request updates', () => {
		const host = makeHost();
		const controller = new LegendController({ host, getConfig: () => mergeConfig().config, onSelect: vi.fn() });
		controller.setPage(3);
		expect(controller.page).toBe(3);
		const wasExpanded = controller.expanded;
		controller.toggle();
		expect(controller.expanded).toBe(!wasExpanded);
	});

	it('applyCollapseDefault respects collapseMode never/always', () => {
		const host = makeHost();
		const never = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseMode: 'never' } }).config,
			onSelect: vi.fn(),
		});
		never.applyCollapseDefault();
		expect(never.expanded).toBe(true);

		const always = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseMode: 'always' } }).config,
			onSelect: vi.fn(),
		});
		always.applyCollapseDefault();
		expect(always.expanded).toBe(false);
	});

	it('collapses after select when collapseOnSelect is always', () => {
		const host = makeHost();
		const controller = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseOnSelect: 'always' } }).config,
			onSelect: vi.fn(),
		});
		controller.select(entry);
		expect(controller.expanded).toBe(false);
	});

	it('never collapses after select when collapseOnSelect is never', () => {
		const host = makeHost();
		const controller = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseOnSelect: 'never' } }).config,
			onSelect: vi.fn(),
		});
		controller.select(entry);
		expect(controller.expanded).toBe(true);
	});

	it('default config values line up with DEFAULT_CONFIG.legend', () => {
		expect(DEFAULT_CONFIG.legend.collapseMode).toBe('mobile');
	});
});
