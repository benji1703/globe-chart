import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { LegendController } from './controllers/legend-controller.js';
import { SearchController } from './controllers/search-controller.js';
import { ThemeController } from './controllers/theme-controller.js';
import { ToastController } from './controllers/toast-controller.js';
import { VisibilityController } from './controllers/visibility-controller.js';
import { scaleColor } from './core/color-scale.js';
import {
	mergeConfig,
	type GlobeChartConfig,
	type GlobeChartConfigInput,
	type LegendSearchHit,
} from './core/config.js';
import { boundingBoxCenter, featureName, isoOf } from './core/iso.js';
import { computeLegendEntries, filterLegendEntriesByMode } from './core/legend-entries.js';
import { paginateItems } from './core/legend-query.js';
import type {
	CountryEventDetail,
	DataRow,
	GeoFeature,
	GlobeChartEventMap,
	LegendEntry,
	LegendSearchEventDetail,
} from './core/types.js';
import { definedProps, isGeoFeature } from './core/types.js';
import { buildValueIndex, parseDataRows } from './core/value-index.js';
import { loadCountryFeatures } from './load-countries.js';
import { ChoroplethLayer } from './scene/choropleth-layer.js';
import { GlobeScene } from './scene/globe-scene.js';
import { renderLegend } from './ui/legend-view.js';
import { globeChartStyles } from './ui/styles/index.js';
import { renderToasts } from './ui/toast-view.js';
import { yieldToMain } from './yield-main.js';

@customElement('globe-chart')
export class GlobeChart extends LitElement {
	static override styles = globeChartStyles;

	declare addEventListener: {
		<K extends keyof GlobeChartEventMap>(
			type: K,
			listener: (this: GlobeChart, ev: GlobeChartEventMap[K]) => void,
			options?: boolean | AddEventListenerOptions,
		): void;
		(
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions,
		): void;
	};

	declare removeEventListener: {
		<K extends keyof GlobeChartEventMap>(
			type: K,
			listener: (this: GlobeChart, ev: GlobeChartEventMap[K]) => void,
			options?: boolean | EventListenerOptions,
		): void;
		(
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | EventListenerOptions,
		): void;
	};

	@property({ type: Array }) data: DataRow[] = [];

	@property({ attribute: 'iso-field' }) isoField = 'iso';

	@property({ attribute: 'value-field' }) valueField = 'value';

	@property({ attribute: 'name-field' }) nameField = 'name';

	@property({ type: Boolean }) loading = false;

	@property({ type: Boolean, attribute: 'legend' }) showLegend = false;

	@property({ attribute: 'legend-position', reflect: true }) legendPosition: 'left' | 'right' =
		'left';

	@property({ type: Boolean }) animated = true;

	@property({ type: Boolean, attribute: 'auto-rotate' }) autoRotate = false;

	@property({ type: Number, attribute: 'auto-rotate-speed' }) autoRotateSpeed = 0.35;

	@property({ type: Boolean, attribute: 'auto-center' }) autoCenter = true;

	@property({ type: Boolean, attribute: 'animate-navigation' }) animateNavigation = true;

	/** Color theme: `light`, `dark`, or `auto` (follow OS). Default `auto`. */
	@property({ reflect: true }) theme: 'light' | 'dark' | 'auto' = 'auto';

	@property({ type: Object, attribute: false })
	config: GlobeChartConfigInput = {};

	/**
	 * Host-driven remote search results (ISO hits). When non-null in `remote` /
	 * `hybrid` mode, these feed the legend list (joined with map values/colors).
	 * Set to `null` to clear and fall back to provider / local filtering.
	 */
	@property({ type: Array, attribute: false })
	legendResults: LegendSearchHit[] | null = null;

	@state() private countryFeatures: GeoFeature[] = [];

	@query('.container') private readonly container?: HTMLDivElement;

	private readonly scene = new GlobeScene();
	private readonly layer = new ChoroplethLayer();
	private resolvedConfig: GlobeChartConfig = mergeConfig().config;
	private globeCreating = false;
	/** Bumped on disconnect / re-create to abandon in-flight WebGL inits. */
	private createGeneration = 0;
	private hasCentered = false;
	private loadingViewReady = false;
	/** First choropleth paint uses 0ms transitions to avoid a multi-hundred-ms long task. */
	private hasPaintedPolygons = false;
	private polygonClickBound = false;
	private readyDispatched = false;
	private lastSkipSignature = '';
	private revealTimer: ReturnType<typeof setTimeout> | undefined;

	private readonly themeController = new ThemeController(this, () => {
		if (this.theme === 'auto' && this.scene.globe) this.applyVisual(false);
	});

	/** Defer WebGL until the host is near the viewport (demo/pages cold load). */
	private readonly visibilityController = new VisibilityController(this, (visible) => {
		if (visible) {
			if (!this.scene.globe && !this.globeCreating) void this.createGlobe();
			else if (this.resolvedConfig.globe.pauseWhenHidden) this.scene.kick();
		} else if (this.scene.globe && this.resolvedConfig.globe.pauseWhenHidden) {
			this.scene.setPaused(true);
		}
	});

	private readonly toastController = new ToastController(this);

	private readonly legendController = new LegendController({
		host: this,
		getConfig: () => this.resolvedConfig,
		onSelect: (entry) => {
			this.scene.pointOfView(
				{ lat: entry.lat, lng: entry.lng, altitude: this.resolvedConfig.camera.jumpAltitude },
				this.motionMs(this.resolvedConfig.camera.durations.navigate, 'camera'),
			);
			this.emitCountry('country-select', entry);
		},
	});

	private readonly searchController = new SearchController({
		host: this,
		getConfig: () => this.resolvedConfig,
		getLegendResults: () => this.legendResults,
	});

	override connectedCallback() {
		super.connectedCallback();
		this.legendController.syncBreakpointListener();
		this.legendController.applyCollapseDefault();
	}

	override render() {
		const index = this.computeIndex();
		const colors = this.themeController.resolve(this.resolvedConfig.colors);
		const entriesInput = {
			index,
			colors,
			countryFeatures: this.countryFeatures,
			nameField: this.nameField,
		};
		const legendConfig = { ...this.resolvedConfig.legend, position: this.legendPosition };
		const all = computeLegendEntries(entriesInput);
		const filtered = filterLegendEntriesByMode({
			all,
			query: this.searchController.query,
			search: legendConfig.search,
			remoteHits: this.searchController.effectiveHits(),
			entriesInput,
		});
		const page = paginateItems(filtered, this.legendController.page, legendConfig.pageSize);

		const legend =
			this.showLegend && !this.loading
				? renderLegend({
						entries: filtered,
						selectedIso: this.legendController.selectedIso,
						config: legendConfig,
						query: this.searchController.query,
						page,
						searching: this.searchController.searching,
						searchError: this.searchController.error,
						expanded: this.legendController.expanded,
						onSelect: (entry) => this.legendController.select(entry),
						onQueryInput: (query) => this.onLegendQueryInput(query),
						onPageChange: (next) => this.legendController.setPage(next),
						onToggle: () => this.legendController.toggle(),
					})
				: null;

		const toasts =
			this.resolvedConfig.toasts.enabled
				? renderToasts({
						items: this.toastController.items,
						position: this.resolvedConfig.toasts.position,
						expandedId: this.toastController.expandedToastId,
						onDismiss: (id) => this.toastController.dismiss(id),
						onToggleDetails: (id) => this.toastController.toggleDetails(id),
					})
				: null;

		return html`
			<div class="globe-area">
				<div class="container"></div>
				${legend} ${toasts}
			</div>
		`;
	}

	private onLegendQueryInput(query: string) {
		this.legendController.setPage(1);
		this.searchController.onQueryInput(query);
	}

	protected override willUpdate(changed: PropertyValues<this>) {
		if (changed.has('config') || changed.has('legendPosition')) {
			this.applyConfigMerge();
		}
		if (changed.has('config')) {
			this.legendController.syncBreakpointListener();
			this.legendController.applyCollapseDefault();
		}
	}

	protected override updated(changed: PropertyValues<this>) {
		if (changed.has('legendResults') && this.legendResults != null) {
			this.searchController.onLegendResultsChanged();
			this.legendController.setPage(1);
		}

		if (!this.scene.globe) {
			if (!this.globeCreating && this.visibilityController.visible) void this.createGlobe();
			return;
		}

		const visualChanged =
			changed.has('data') ||
			changed.has('isoField') ||
			changed.has('valueField') ||
			changed.has('nameField') ||
			changed.has('loading') ||
			changed.has('animated') ||
			changed.has('autoCenter') ||
			changed.has('animateNavigation') ||
			changed.has('config') ||
			changed.has('theme');

		if (visualChanged) {
			this.applyVisual(changed.has('loading'));
			return;
		}

		if (changed.has('autoRotate') || changed.has('autoRotateSpeed')) {
			this.scene.syncRotation({
				loading: this.loading,
				autoRotate: this.autoRotate,
				autoRotateSpeed: this.autoRotateSpeed,
				config: this.resolvedConfig,
			});
		}
	}

	private applyConfigMerge() {
		const { config, unknownKeys, invalid, invalidPaths } = mergeConfig(this.config);
		if (this.legendPosition === 'left' || this.legendPosition === 'right') {
			config.legend.position = this.legendPosition;
		}
		this.resolvedConfig = config;
		this.syncLegendMaxHeight();

		if (invalid) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Invalid configuration',
					body: 'The config value was ignored. Pass a plain object with known keys.',
					code: 'invalid-config',
					once: true,
				},
				config.toasts,
			);
		} else if (unknownKeys.length) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Unknown config keys',
					body: `Ignored: ${unknownKeys.join(', ')}.`,
					details: unknownKeys.join('\n'),
					code: 'unknown-config-keys',
					once: true,
				},
				config.toasts,
			);
		} else if (invalidPaths.length) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Invalid config values',
					body: `Coerced or ignored: ${invalidPaths.join(', ')}.`,
					details: invalidPaths.join('\n'),
					code: 'invalid-config-paths',
					once: true,
				},
				config.toasts,
			);
		}
	}

	private syncLegendMaxHeight() {
		const maxHeight = this.resolvedConfig.legend.maxHeight?.trim();
		if (maxHeight) {
			this.style.setProperty('--globe-chart-legend-max-height', maxHeight);
		} else {
			this.style.removeProperty('--globe-chart-legend-max-height');
		}
	}

	private async createGlobe() {
		const el = this.container;
		if (!el || this.globeCreating || !this.isConnected) return;
		this.globeCreating = true;
		const generation = ++this.createGeneration;
		this.applyConfigMerge();

		try {
			// Let the host page paint chrome before pulling in globe.gl / TopoJSON.
			await yieldToMain();
			if (generation !== this.createGeneration || !this.isConnected) return;

			const [, countries] = await Promise.all([
				this.scene.create({
					element: el,
					config: this.resolvedConfig,
					motionMs: (ms, kind) => this.motionMs(ms, kind),
				}),
				loadCountryFeatures(),
			]);

			// Aborted: this instance was torn down mid-init.
			if (generation !== this.createGeneration || !this.isConnected) {
				this.scene.destroy();
				return;
			}

			this.countryFeatures = countries;
			if (!this.countryFeatures.length) {
				this.toastController.notify(
					{
						level: 'error',
						title: 'Map data missing',
						body: 'Country polygons failed to load. Check the package assets and try again.',
						code: 'geojson-empty',
					},
					this.resolvedConfig.toasts,
				);
			}

			// Split WebGL construct vs polygon mesh build across frames.
			await yieldToMain();
			if (generation !== this.createGeneration || !this.isConnected) {
				this.scene.destroy();
				return;
			}

			this.applyVisual(false);

			if (!this.readyDispatched) {
				this.readyDispatched = true;
				this.dispatchEvent(new CustomEvent('ready', { bubbles: true, composed: true }));
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			if (generation !== this.createGeneration || !this.isConnected) {
				this.scene.destroy();
				return;
			}
			const message = err instanceof Error ? err.message : String(err);
			this.toastController.notify(
				{
					level: 'error',
					title: 'Couldn’t start the globe',
					body: 'WebGL or map assets failed to initialize. Try another browser or disable blockers.',
					details: message,
					code: 'globe-init-failed',
				},
				this.resolvedConfig.toasts,
			);
		} finally {
			if (generation === this.createGeneration) this.globeCreating = false;
		}
	}

	private computeIndex() {
		const parsed = parseDataRows(this.data);
		if (parsed.invalid) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Invalid data',
					body: 'Expected an array of row objects. Data was ignored.',
					code: 'invalid-data',
					once: true,
				},
				this.resolvedConfig.toasts,
			);
		}
		return buildValueIndex({
			data: parsed.rows,
			isoField: this.isoField,
			valueField: this.valueField,
		});
	}

	private currentLegendEntries(): LegendEntry[] {
		return computeLegendEntries({
			index: this.computeIndex(),
			colors: this.themeController.resolve(this.resolvedConfig.colors),
			countryFeatures: this.countryFeatures,
			nameField: this.nameField,
		});
	}

	private applyVisual(loadingChanged: boolean) {
		const globe = this.scene.globe;
		if (!globe) return;

		const index = this.computeIndex();
		const colors = this.themeController.resolve(this.resolvedConfig.colors);
		const isLoading = this.loading;
		// Instant first mesh build — animated polygon morphs on cold start are a long task.
		const duration = this.hasPaintedPolygons
			? this.motionMs(this.resolvedConfig.camera.durations.polygon)
			: 0;

		this.reportDataFeedback(index, isLoading);

		this.layer.paint({
			globe,
			features: this.countryFeatures,
			index,
			colors,
			config: this.resolvedConfig,
			loading: isLoading,
			transitionMs: duration,
			nameField: this.nameField,
		});
		this.hasPaintedPolygons = true;
		try {
			globe.enablePointerInteraction(true);
		} catch {
			/* older globe.gl */
		}

		if (!this.polygonClickBound) {
			this.polygonClickBound = true;
			globe.onPolygonClick((poly) => this.handlePolygonClick(poly));
		}

		this.scene.syncRotation({
			loading: isLoading,
			autoRotate: this.autoRotate,
			autoRotateSpeed: this.autoRotateSpeed,
			config: this.resolvedConfig,
		});
		// Wake long enough for the mesh/transition to land, then idle-pause (unless spinning).
		this.scene.kick(Math.max(duration, 120) + 80);

		if (isLoading) {
			clearTimeout(this.revealTimer);
			this.hasCentered = false;
			this.legendController.selectedIso = null;
			if (loadingChanged) this.loadingViewReady = false;
			if (!this.loadingViewReady) {
				this.scene.pointOfView({ ...this.resolvedConfig.camera.initial }, 0);
				this.loadingViewReady = true;
			}
			return;
		}

		this.loadingViewReady = false;

		if (!this.hasCentered || loadingChanged) {
			this.hasCentered = true;
			clearTimeout(this.revealTimer);

			if (!this.autoCenter) {
				if (loadingChanged) {
					this.scene.pointOfView({ ...this.resolvedConfig.camera.initial }, 0);
				}
				return;
			}

			const cameraMs = loadingChanged
				? this.resolvedConfig.camera.durations.reveal
				: this.resolvedConfig.camera.durations.navigate;
			const startFly = () => this.centerOnBiggestValue(cameraMs);
			if (loadingChanged && this.animated && this.animateNavigation) {
				this.revealTimer = setTimeout(startFly, 50);
			} else {
				// First reveal: point camera without waiting on a nested timeout.
				startFly();
			}
		}
	}

	private handlePolygonClick(poly: object) {
		if (this.loading) return;
		if (!isGeoFeature(poly)) return;
		const feature = poly;
		const iso = isoOf(feature);
		if (!iso) return;
		const index = this.computeIndex();
		const colors = this.themeController.resolve(this.resolvedConfig.colors);
		const fromLegend = this.currentLegendEntries().find((e) => e.iso === iso);
		if (fromLegend) {
			this.legendController.select(fromLegend);
			return;
		}
		const center = boundingBoxCenter(feature.geometry);
		if (!center) return;
		const value = index.valueMap[iso] ?? 0;
		const entry: LegendEntry = {
			iso,
			name: featureName(feature, iso),
			value,
			color: scaleColor(value, index.maxValue, colors),
			lat: center.lat,
			lng: center.lng,
			...definedProps({ row: index.rowByIso[iso] }),
		};
		this.legendController.select(entry);
	}

	private reportDataFeedback(
		index: ReturnType<typeof buildValueIndex>,
		isLoading: boolean,
	) {
		if (isLoading) return;

		if (index.skipped.length) {
			const signature = `${index.skipped.length}:${index.skipped.map((s) => `${s.index}-${s.reason}`).join(',')}`;
			if (signature !== this.lastSkipSignature) {
				this.lastSkipSignature = signature;
				const details = index.skipped
					.map((s) => `Row ${s.index}: ${s.reason}`)
					.join('\n');
				this.toastController.notify(
					{
						level: 'warning',
						title: `${index.skipped.length} row${index.skipped.length === 1 ? '' : 's'} skipped`,
						body: 'Missing ISO codes or non-numeric values were ignored.',
						details,
						code: 'data-skipped',
					},
					this.resolvedConfig.toasts,
				);
			}
		} else {
			this.lastSkipSignature = '';
		}

		if (!this.data.length || index.validCount === 0) {
			this.toastController.notify(
				{
					level: 'info',
					title: 'No country values',
					body: 'Pass a data array with ISO codes and numeric values to color the map.',
					code: 'empty-data',
					once: true,
				},
				this.resolvedConfig.toasts,
			);
		} else {
			this.toastController.clearSeen('empty-data');
		}
	}

	private centerOnBiggestValue(durationMs: number) {
		const top = this.currentLegendEntries()[0];
		if (top) {
			this.legendController.selectedIso = top.iso;
			this.scene.pointOfView(
				{
					lat: top.lat,
					lng: top.lng,
					altitude: this.resolvedConfig.camera.initial.altitude,
				},
				this.motionMs(durationMs, 'camera'),
			);
		} else {
			this.legendController.selectedIso = null;
			this.scene.pointOfView(
				{ ...this.resolvedConfig.camera.initial },
				this.motionMs(durationMs, 'camera'),
			);
		}
	}

	private motionMs(ms: number, kind: 'polygon' | 'camera' = 'polygon'): number {
		if (!this.animated) return 0;
		if (kind === 'camera' && !this.animateNavigation) return 0;
		if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return 0;
		}
		return ms;
	}

	private emitCountry(name: 'country-select' | 'country-hover', entry: LegendEntry) {
		const detail: CountryEventDetail = {
			iso: entry.iso,
			name: entry.name,
			value: entry.value,
			color: entry.color,
			...definedProps({
				lat: entry.lat,
				lng: entry.lng,
				row: entry.row,
			}),
		};
		this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.createGeneration += 1;
		this.globeCreating = false;
		this.hasPaintedPolygons = false;
		this.polygonClickBound = false;
		this.hasCentered = false;
		this.readyDispatched = false;
		clearTimeout(this.revealTimer);
		this.scene.destroy();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'globe-chart': GlobeChart;
	}

	interface HTMLElementEventMap {
		ready: CustomEvent<undefined>;
		'country-select': CustomEvent<CountryEventDetail>;
		'country-hover': CustomEvent<CountryEventDetail>;
		'legend-search': CustomEvent<LegendSearchEventDetail>;
	}
}
