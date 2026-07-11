import { describe, expect, it, vi } from 'vitest';

import { ThemeController } from './theme-controller.js';

function makeHost() {
	const el = document.createElement('div');
	el.style.setProperty('--globe-chart-ocean-color', '#123456');
	document.body.appendChild(el);
	return Object.assign(el, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('ThemeController', () => {
	it('registers itself with the host', () => {
		const host = makeHost();
		new ThemeController(host, () => {});
		expect(host.addController).toHaveBeenCalledTimes(1);
	});

	it('resolves colors from config over CSS custom properties over hardcoded fallbacks', () => {
		const host = makeHost();
		const controller = new ThemeController(host, () => {});
		const colors = controller.resolve({});
		expect(colors.ocean).toBe('#123456');
		expect(colors.empty).toBe('#eef6fc');

		const withConfig = controller.resolve({ ocean: '#abcdef' });
		expect(withConfig.ocean).toBe('#abcdef');
	});
});
