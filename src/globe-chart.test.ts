import { describe, expect, it, vi } from 'vitest';

import type { DataRow } from './types.js';

class FakeResizeObserver {
	observe() {
		/* no-op */
	}
	disconnect() {
		/* no-op */
	}
	unobserve() {
		/* no-op */
	}
}

vi.stubGlobal('ResizeObserver', FakeResizeObserver);

class FakeGlobe {
	controlsState = {
		autoRotate: false,
		autoRotateSpeed: 0,
		enableDamping: false,
		enablePan: false,
		dampingFactor: 0.05,
		domElement: { removeEventListener() { /* no-op */ } },
		_onContextMenu: () => {
			/* no-op */
		},
		addEventListener() {
			/* no-op */
		},
		removeEventListener() {
			/* no-op */
		},
	};
	lastPointOfView: unknown;
	paused = false;

	width() {
		return this;
	}
	height() {
		return this;
	}
	polygonsData() {
		return this;
	}
	polygonsTransitionDuration() {
		return this;
	}
	polygonAltitude() {
		return this;
	}
	polygonCapCurvatureResolution() {
		return this;
	}
	globeImageUrl() {
		return this;
	}
	backgroundColor() {
		return this;
	}
	atmosphereColor() {
		return this;
	}
	atmosphereAltitude() {
		return this;
	}
	polygonCapMaterial() {
		return this;
	}
	polygonCapColor() {
		return this;
	}
	polygonSideColor() {
		return this;
	}
	polygonStrokeColor() {
		return this;
	}
	polygonLabel() {
		return this;
	}
	onPolygonClick() {
		return this;
	}
	enablePointerInteraction() {
		return this;
	}
	controls() {
		return this.controlsState;
	}
	renderer() {
		return {
			setPixelRatio() {
				/* no-op */
			},
			getContext() {
				return {};
			},
			forceContextLoss() {
				/* no-op */
			},
			dispose() {
				/* no-op */
			},
		};
	}
	pauseAnimation() {
		this.paused = true;
		return this;
	}
	resumeAnimation() {
		this.paused = false;
		return this;
	}
	pointOfView(view?: unknown) {
		this.lastPointOfView = view;
		return this;
	}
	_destructor() {
		/* no-op */
	}
}

vi.mock('globe.gl', () => ({ default: FakeGlobe }));

vi.mock('./load-countries', () => ({
	loadCountryFeatures: async () => [
		{
			type: 'Feature',
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
			type: 'Feature',
			properties: { i: 'FR', n: 'France' },
			geometry: {
				type: 'MultiPolygon',
				coordinates: [
					[
						[
							[2, 46],
							[3, 46],
							[3, 47],
							[2, 47],
							[2, 46],
						],
					],
				],
			},
		},
		{
			type: 'Feature',
			properties: { i: 'DE', n: 'Germany' },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[6, 47],
						[14, 47],
						[14, 55],
						[6, 55],
						[6, 47],
					],
				],
			},
		},
	],
}));

const { globeChartMockData } = await import('./globe-chart.mock-data.js');
await import('./globe-chart.js');

async function mountGlobe(
	props: Partial<{ data: DataRow[]; showLegend: boolean; loading: boolean }> = {},
) {
	const el = document.createElement('globe-chart');
	el.data = props.data ?? globeChartMockData;
	el.showLegend = props.showLegend ?? false;
	el.loading = props.loading ?? false;
	document.body.appendChild(el);
	await el.updateComplete;
	// Wait for async createGlobe + the @state re-render that fills the legend
	await vi.waitFor(() => {
		if (props.showLegend && !props.loading) {
			expect(el.shadowRoot?.querySelector('.legend-name')).not.toBeNull();
		} else {
			expect(el.shadowRoot?.querySelector('.container')).not.toBeNull();
		}
	});
	await el.updateComplete;
	return el;
}

describe('globe-chart', () => {
	it('registers as a custom element', () => {
		expect(customElements.get('globe-chart')).toBeDefined();
	});

	it('renders without throwing when given data', async () => {
		const el = await mountGlobe();
		expect(el.shadowRoot?.querySelector('.container')).not.toBeNull();
		el.remove();
	});

	it('renders the globe container while loading, without throwing', async () => {
		const el = await mountGlobe({ loading: true });
		expect(el.shadowRoot?.querySelector('.container')).not.toBeNull();
		expect(el.shadowRoot?.querySelector('.legend')).toBeNull();
		el.remove();
	});

	it('renders legend country names after geo data loads', async () => {
		const el = await mountGlobe({
			showLegend: true,
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
				{ iso: 'DE', value: 320 },
			],
		});

		const names = [...(el.shadowRoot?.querySelectorAll('.legend-name') ?? [])].map((n) => n.textContent);
		expect(names).toContain('United States');
		expect(names).toContain('France');
		expect(names).toContain('Germany');
		el.remove();
	});

	it('jumps the camera when a legend row is clicked', async () => {
		const el = await mountGlobe({
			showLegend: true,
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
			],
		});

		const franceRow = [...(el.shadowRoot?.querySelectorAll('.legend-row') ?? [])].find((btn) =>
			btn.textContent?.includes('France'),
		);
		expect(franceRow).toBeTruthy();
		(franceRow as HTMLButtonElement).click();

		const globe = (el as unknown as { scene: { globe: FakeGlobe } }).scene.globe;
		expect(globe.lastPointOfView).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number) });
		// Largest polygon is metropolitan France, not Guiana
		expect((globe.lastPointOfView as { lng: number }).lng).toBeGreaterThan(0);
		expect((globe.lastPointOfView as { lng: number }).lng).toBeLessThan(10);
		el.remove();
	});

	it('highlights the selected legend row after click', async () => {
		const el = await mountGlobe({
			showLegend: true,
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
			],
		});
		el.config = {
			legend: { collapsible: true, collapseMode: 'never', collapseOnSelect: 'never' },
		};
		await el.updateComplete;

		const franceRow = [...(el.shadowRoot?.querySelectorAll('.legend-row') ?? [])].find((btn) =>
			btn.textContent?.includes('France'),
		) as HTMLButtonElement;
		franceRow.click();
		await el.updateComplete;

		expect(franceRow.getAttribute('aria-current')).toBe('true');
		el.remove();
	});

	it('enables auto-rotate when autoRotate is set', async () => {
		const el = await mountGlobe({ data: [{ iso: 'US', value: 10 }] });
		await vi.waitFor(() => {
			expect((el as unknown as { scene: { globe: FakeGlobe | null } }).scene.globe).toBeTruthy();
		});
		el.autoRotate = true;
		await el.updateComplete;
		await new Promise((resolve) => setTimeout(resolve, 0));
		await el.updateComplete;

		const globe = (el as unknown as { scene: { globe: FakeGlobe } }).scene.globe;
		expect(globe.controlsState.autoRotate).toBe(true);
		el.remove();
	});

	it('disables camera motion when animateNavigation is false', async () => {
		const el = await mountGlobe({
			showLegend: true,
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
			],
		});
		el.animateNavigation = false;
		await el.updateComplete;

		const franceRow = [...(el.shadowRoot?.querySelectorAll('.legend-row') ?? [])].find((btn) =>
			btn.textContent?.includes('France'),
		) as HTMLButtonElement;
		franceRow.click();

		const globe = (el as unknown as { scene: { globe: FakeGlobe } }).scene.globe;
		expect(globe.lastPointOfView).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number) });
		el.remove();
	});

	it('shows a warning toast for skipped rows', async () => {
		const el = await mountGlobe({
			data: [
				{ iso: 'US', value: 10 },
				{ iso: '', value: 1 },
				{ iso: 'XX', value: 'nope' },
			],
		});
		await vi.waitFor(() => {
			expect(el.shadowRoot?.querySelector('.toast--warning')).not.toBeNull();
		});
		expect(el.shadowRoot?.textContent).toMatch(/skipped/i);
		el.remove();
	});

	it('filters and pages the legend', async () => {
		const el = await mountGlobe({
			showLegend: true,
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
				{ iso: 'DE', value: 320 },
			],
		});
		el.config = {
			legend: {
				pageSize: 1,
				search: { enabled: true, mode: 'local' },
			},
		};
		await el.updateComplete;

		const input = el.shadowRoot?.querySelector('.legend-search__input') as HTMLInputElement;
		expect(input).toBeTruthy();
		input.value = 'fran';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await el.updateComplete;

		const names = [...(el.shadowRoot?.querySelectorAll('.legend-name') ?? [])].map((n) => n.textContent);
		expect(names).toEqual(['France']);
		expect(el.shadowRoot?.querySelector('.legend-pager')).toBeNull();
		el.remove();
	});

	it('runs remote legend search via provider', async () => {
		const el = await mountGlobe({
			showLegend: true,
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
				{ iso: 'DE', value: 320 },
			],
		});
		el.config = {
			legend: {
				search: {
					enabled: true,
					mode: 'remote',
					debounceMs: 0,
					minLength: 1,
					provider: async () => [{ iso: 'DE', name: 'Germany' }],
				},
			},
		};
		await el.updateComplete;

		const input = el.shadowRoot?.querySelector('.legend-search__input') as HTMLInputElement;
		input.value = 'ger';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => {
			const names = [...(el.shadowRoot?.querySelectorAll('.legend-name') ?? [])].map((n) => n.textContent);
			expect(names).toEqual(['Germany']);
		});
		el.remove();
	});

	it('keeps the legend open after select on desktop (collapseOnSelect mobile)', async () => {
		const el = await mountGlobe({
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
			],
			showLegend: true,
		});
		el.config = {
			legend: {
				collapsible: true,
				collapseMode: 'never',
				collapseOnSelect: 'mobile',
			},
		};
		await el.updateComplete;
		const franceRow = [...(el.shadowRoot?.querySelectorAll('.legend-row') ?? [])].find((btn) =>
			btn.textContent?.includes('France'),
		) as HTMLButtonElement;
		franceRow.click();
		await el.updateComplete;
		expect(el.shadowRoot?.querySelector('.legend')).not.toBeNull();
		expect(el.shadowRoot?.querySelector('.legend-toggle')).toBeNull();
		el.remove();
	});

	it('collapses the legend after a row click when collapseOnSelect is always', async () => {
		const el = await mountGlobe({
			data: [
				{ iso: 'US', value: 1200 },
				{ iso: 'FR', value: 280 },
			],
			showLegend: true,
		});
		el.config = {
			legend: {
				collapsible: true,
				collapseMode: 'always',
				collapseOnSelect: 'always',
			},
		};
		await el.updateComplete;
		expect(el.shadowRoot?.querySelector('.legend-toggle')).not.toBeNull();
		(el.shadowRoot?.querySelector('.legend-toggle') as HTMLButtonElement).click();
		await el.updateComplete;
		expect(el.shadowRoot?.querySelector('.legend')).not.toBeNull();
		const franceRow = [...(el.shadowRoot?.querySelectorAll('.legend-row') ?? [])].find((btn) =>
			btn.textContent?.includes('France'),
		) as HTMLButtonElement;
		franceRow.click();
		await el.updateComplete;
		expect(el.shadowRoot?.querySelector('.legend-toggle')).not.toBeNull();
		expect(el.shadowRoot?.querySelector('.legend')).toBeNull();
		el.remove();
	});
});
