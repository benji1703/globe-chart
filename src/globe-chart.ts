import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { scaleColor } from './color-scale.js';
import {
	DEFAULT_CONFIG,
	mergeConfig,
	type GlobeChartConfig,
	type GlobeChartConfigInput,
	type LegendSearchHit,
} from './config.js';
import { boundingBoxCenter, featureName, isoOf } from './iso.js';
import { loadCountryFeatures } from './load-countries.js';
import { ChoroplethLayer } from './layer/choropleth-layer.js';
import {
	filterLegendEntries,
	mergeLegendByIso,
	paginateItems,
} from './legend-query.js';
import { GlobeScene } from './scene/globe-scene.js';
import {
	clearSeenCode,
	clearToasts,
	createToastState,
	dismissToast,
	pushToast,
	type ToastState,
} from './toast.js';
import type {
	CountryEventDetail,
	DataRow,
	FeedbackEventDetail,
	GeoFeature,
	GlobeChartEventMap,
	LegendEntry,
	LegendSearchEventDetail,
	ThemeColors,
} from './types.js';
import { assertNever, definedProps, isGeoFeature } from './types.js';
import { renderLegend } from './ui/legend.js';
import { globeChartStyles } from './ui/styles.js';
import { renderToasts } from './ui/toasts.js';
import { buildValueIndex, parseDataRows } from './value-index.js';
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

	@state() private selectedIso: string | null = null;
	@state() private countryFeatures: GeoFeature[] = [];
	@state() private toastState: ToastState = createToastState();
	@state() private expandedToastId: string | null = null;
	@state() private legendQuery = '';
	@state() private legendPage = 1;
	@state() private remoteHits: LegendSearchHit[] = [];
	@state() private legendSearching = false;
	@state() private legendSearchError: string | null = null;
	/** Whether the legend panel is open (vs collapsed toggle button). */
	@state() private legendExpanded = true;

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
	/** Defer WebGL until the host is near the viewport (demo/pages cold load). */
	private visibleEnough = typeof IntersectionObserver === 'undefined';
	private visibilityObserver: IntersectionObserver | undefined;
	private revealTimer: ReturnType<typeof setTimeout> | undefined;
	private warningTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private readyDispatched = false;
	private lastSkipSignature = '';
	private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	private searchAbort: AbortController | undefined;
	private colorSchemeMq: MediaQueryList | undefined;
	private legendBreakpointMq: MediaQueryList | undefined;
	private readonly onColorSchemeChange = () => {
		if (this.theme === 'auto' && this.scene.globe) this.applyVisual(false);
	};
	private readonly onLegendBreakpointChange = () => {
		this.applyLegendCollapseDefault();
	};

	override connectedCallback() {
		super.connectedCallback();
		if (typeof matchMedia === 'function') {
			this.colorSchemeMq = matchMedia('(prefers-color-scheme: dark)');
			this.colorSchemeMq.addEventListener('change', this.onColorSchemeChange);
		}
		this.syncLegendBreakpointListener();
		this.applyLegendCollapseDefault();
		this.observeVisibility();
	}

	private observeVisibility() {
		if (typeof IntersectionObserver !== 'function') {
			this.visibleEnough = true;
			return;
		}
		this.visibilityObserver?.disconnect();
		this.visibilityObserver = new IntersectionObserver(
			(entries) => {
				const visible = entries.some((e) => e.isIntersecting);
				this.visibleEnough = visible || this.visibleEnough;
				if (visible) {
					if (!this.scene.globe && !this.globeCreating) void this.createGlobe();
					else if (this.resolvedConfig.globe.pauseWhenHidden) this.scene.kick();
				} else if (this.scene.globe && this.resolvedConfig.globe.pauseWhenHidden) {
					this.scene.setPaused(true);
				}
			},
			{ rootMargin: '120px', threshold: 0 },
		);
		this.visibilityObserver.observe(this);
	}

	override render() {
		const legendConfig = {
			...this.resolvedConfig.legend,
			position: this.legendPosition,
		};
		const filtered = this.filteredLegendEntries;
		const page = paginateItems(filtered, this.legendPage, legendConfig.pageSize);

		const legend =
			this.showLegend && !this.loading
				? renderLegend({
						entries: filtered,
						selectedIso: this.selectedIso,
						config: legendConfig,
						query: this.legendQuery,
						page,
						searching: this.legendSearching,
						searchError: this.legendSearchError,
						expanded: this.legendExpanded,
						onSelect: (entry) => this.jumpTo(entry),
						onQueryInput: (query) => this.onLegendQueryInput(query),
						onPageChange: (next) => {
							this.legendPage = next;
						},
						onToggle: () => {
							this.legendExpanded = !this.legendExpanded;
						},
					})
				: null;

		const toasts =
			this.resolvedConfig.toasts.enabled
				? renderToasts({
						items: this.toastState.items,
						position: this.resolvedConfig.toasts.position,
						expandedId: this.expandedToastId,
						onDismiss: (id) => this.onDismissToast(id),
						onToggleDetails: (id) => {
							this.expandedToastId = this.expandedToastId === id ? null : id;
						},
					})
				: null;

		return html`
			<div class="globe-area">
				<div class="container"></div>
				${legend} ${toasts}
			</div>
		`;
	}

	/** Full ranked legend from current data (unfiltered). */
	private get legendEntries(): LegendEntry[] {
		const index = this.computeIndex();
		const colors = this.resolveThemeColors();

		return Object.entries(index.valueMap)
			.map(([iso, value]): LegendEntry | null => {
				const feat = this.countryFeatures.find((f) => isoOf(f) === iso);
				const center = feat && boundingBoxCenter(feat.geometry);
				if (!feat || !center) return null;

				const row = index.rowByIso[iso];
				const nameFromRow =
					row && this.nameField in row ? String(row[this.nameField] ?? '') : '';

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

	private get filteredLegendEntries(): LegendEntry[] {
		const search = this.resolvedConfig.legend.search;
		const all = this.legendEntries;
		const query = this.legendQuery.trim();

		if (!search.enabled || !query) return all;

		const mode = search.mode;
		const local = mode === 'remote' ? [] : filterLegendEntries(all, query);
		const remoteEntries =
			mode === 'local' ? [] : this.hitsToEntries(this.effectiveRemoteHits(), all);

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

	private effectiveRemoteHits(): LegendSearchHit[] {
		if (this.legendResults != null) return this.legendResults;
		return this.remoteHits;
	}

	private hitsToEntries(hits: LegendSearchHit[], all: LegendEntry[]): LegendEntry[] {
		const byIso = new Map(all.map((e) => [e.iso, e]));
		const index = this.computeIndex();
		const colors = this.resolveThemeColors();
		const out: LegendEntry[] = [];

		for (const hit of hits) {
			const iso = String(hit.iso ?? '').toUpperCase();
			if (!iso) continue;
			const existing = byIso.get(iso);
			const value = hit.value ?? existing?.value ?? index.valueMap[iso] ?? 0;
			const feat = this.countryFeatures.find((f) => isoOf(f) === iso);
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

	private onLegendQueryInput(query: string) {
		this.legendQuery = query;
		this.legendPage = 1;
		this.legendSearchError = null;

		const search = this.resolvedConfig.legend.search;
		if (!search.enabled) return;

		clearTimeout(this.searchDebounceTimer);
		const trimmed = query.trim();

		if (search.mode === 'local') {
			this.remoteHits = [];
			this.legendSearching = false;
			return;
		}

		if (trimmed.length < search.minLength) {
			this.searchAbort?.abort();
			this.remoteHits = [];
			this.legendSearching = false;
			return;
		}

		this.searchDebounceTimer = setTimeout(() => {
			void this.runLegendSearch(trimmed);
		}, search.debounceMs);
	}

	private async runLegendSearch(query: string) {
		const search = this.resolvedConfig.legend.search;
		this.searchAbort?.abort();
		const abort = new AbortController();
		this.searchAbort = abort;

		const detail: LegendSearchEventDetail = { query, signal: abort.signal };
		this.dispatchEvent(
			new CustomEvent('legend-search', { detail, bubbles: true, composed: true }),
		);

		if (!search.provider) {
			// Host is expected to set `legendResults` from the event.
			this.legendSearching = this.legendResults == null;
			return;
		}

		this.legendSearching = true;
		this.legendSearchError = null;
		try {
			const hits = await search.provider(query, abort.signal);
			if (abort.signal.aborted) return;
			this.remoteHits = hits ?? [];
		} catch (err) {
			if (abort.signal.aborted) return;
			this.remoteHits = [];
			this.legendSearchError = err instanceof Error ? err.message : 'Search failed';
		} finally {
			if (!abort.signal.aborted) this.legendSearching = false;
		}
	}

	private jumpTo(entry: LegendEntry) {
		this.selectedIso = entry.iso;
		this.scene.pointOfView(
			{
				lat: entry.lat,
				lng: entry.lng,
				altitude: this.resolvedConfig.camera.jumpAltitude,
			},
			this.motionMs(this.resolvedConfig.camera.durations.navigate, 'camera'),
		);
		this.emitCountry('country-select', entry);
		this.maybeCollapseLegendAfterSelect();
	}

	private maybeCollapseLegendAfterSelect() {
		const legend = this.resolvedConfig.legend;
		if (!legend.collapsible) return;
		const mode = legend.collapseOnSelect;
		if (mode === 'never') return;
		if (mode === 'always') {
			this.legendExpanded = false;
			return;
		}
		// mobile — only collapse on small screens
		const mobile =
			this.legendBreakpointMq?.matches ??
			(typeof matchMedia === 'function' && matchMedia(legend.mobileBreakpoint).matches);
		if (mobile) this.legendExpanded = false;
	}

	private applyLegendCollapseDefault() {
		const legend = this.resolvedConfig.legend;
		if (!legend.collapsible || legend.collapseMode === 'never') {
			this.legendExpanded = true;
			return;
		}
		if (legend.collapseMode === 'always') {
			this.legendExpanded = false;
			return;
		}
		// mobile
		const mobile = this.legendBreakpointMq?.matches ?? false;
		this.legendExpanded = !mobile;
	}

	private syncLegendBreakpointListener() {
		this.legendBreakpointMq?.removeEventListener('change', this.onLegendBreakpointChange);
		this.legendBreakpointMq = undefined;
		const legend = this.resolvedConfig.legend;
		const needsMq =
			legend.collapsible &&
			(legend.collapseMode === 'mobile' || legend.collapseOnSelect === 'mobile');
		if (typeof matchMedia !== 'function' || !needsMq) {
			return;
		}
		this.legendBreakpointMq = matchMedia(legend.mobileBreakpoint);
		this.legendBreakpointMq.addEventListener('change', this.onLegendBreakpointChange);
	}

	protected override willUpdate(changed: PropertyValues<this>) {
		if (changed.has('config') || changed.has('legendPosition')) {
			this.applyConfigMerge();
		}
		if (changed.has('config') || changed.has('theme')) {
			this.syncLegendMaxHeight();
		}
		if (changed.has('config')) {
			this.syncLegendBreakpointListener();
			this.applyLegendCollapseDefault();
		}
	}

	protected override updated(changed: PropertyValues<this>) {
		if (changed.has('legendResults') && this.legendResults != null) {
			this.legendSearching = false;
			this.legendPage = 1;
		}

		if (!this.scene.globe) {
			if (!this.globeCreating && this.visibleEnough) void this.createGlobe();
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
			this.notify({
				level: 'warning',
				title: 'Invalid configuration',
				body: 'The config value was ignored. Pass a plain object with known keys.',
				code: 'invalid-config',
				once: true,
			});
		} else if (unknownKeys.length) {
			this.notify({
				level: 'warning',
				title: 'Unknown config keys',
				body: `Ignored: ${unknownKeys.join(', ')}.`,
				details: unknownKeys.join('\n'),
				code: 'unknown-config-keys',
				once: true,
			});
		} else if (invalidPaths.length) {
			this.notify({
				level: 'warning',
				title: 'Invalid config values',
				body: `Coerced or ignored: ${invalidPaths.join(', ')}.`,
				details: invalidPaths.join('\n'),
				code: 'invalid-config-paths',
				once: true,
			});
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
				this.notify({
					level: 'error',
					title: 'Map data missing',
					body: 'Country polygons failed to load. Check the package assets and try again.',
					code: 'geojson-empty',
				});
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
			this.notify({
				level: 'error',
				title: 'Couldn’t start the globe',
				body: 'WebGL or map assets failed to initialize. Try another browser or disable blockers.',
				details: message,
				code: 'globe-init-failed',
			});
		} finally {
			if (generation === this.createGeneration) this.globeCreating = false;
		}
	}

	private computeIndex() {
		const parsed = parseDataRows(this.data);
		if (parsed.invalid) {
			this.notify({
				level: 'warning',
				title: 'Invalid data',
				body: 'Expected an array of row objects. Data was ignored.',
				code: 'invalid-data',
				once: true,
			});
		}
		return buildValueIndex({
			data: parsed.rows,
			isoField: this.isoField,
			valueField: this.valueField,
		});
	}

	private applyVisual(loadingChanged: boolean) {
		const globe = this.scene.globe;
		if (!globe) return;

		const index = this.computeIndex();
		const colors = this.resolveThemeColors();
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
			this.selectedIso = null;
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
		const colors = this.resolveThemeColors();
		const fromLegend = this.legendEntries.find((e) => e.iso === iso);
		if (fromLegend) {
			this.jumpTo(fromLegend);
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
		this.jumpTo(entry);
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
				this.notify({
					level: 'warning',
					title: `${index.skipped.length} row${index.skipped.length === 1 ? '' : 's'} skipped`,
					body: 'Missing ISO codes or non-numeric values were ignored.',
					details,
					code: 'data-skipped',
				});
			}
		} else {
			this.lastSkipSignature = '';
		}

		if (!this.data.length || index.validCount === 0) {
			this.notify({
				level: 'info',
				title: 'No country values',
				body: 'Pass a data array with ISO codes and numeric values to color the map.',
				code: 'empty-data',
				once: true,
			});
		} else {
			this.toastState = clearSeenCode(this.toastState, 'empty-data');
		}
	}

	private centerOnBiggestValue(durationMs: number) {
		const top = this.legendEntries[0];
		if (top) {
			this.selectedIso = top.iso;
			this.scene.pointOfView(
				{
					lat: top.lat,
					lng: top.lng,
					altitude: this.resolvedConfig.camera.initial.altitude,
				},
				this.motionMs(durationMs, 'camera'),
			);
		} else {
			this.selectedIso = null;
			this.scene.pointOfView(
				{ ...this.resolvedConfig.camera.initial },
				this.motionMs(durationMs, 'camera'),
			);
		}
	}

	private resolveThemeColors(): ThemeColors {
		const style = getComputedStyle(this);
		const read = (name: string) => style.getPropertyValue(name).trim();
		const cfg = this.resolvedConfig.colors;
		const low =
			cfg.low ||
			read('--globe-chart-low-color') ||
			read('--globe-chart-risk-low-color') ||
			'#f5c518';
		const high =
			cfg.high ||
			read('--globe-chart-high-color') ||
			read('--globe-chart-risk-high-color') ||
			read('--globe-chart-land-color') ||
			'#c41e1e';

		return {
			ocean: cfg.ocean || read('--globe-chart-ocean-color') || '#c8e0f5',
			empty: cfg.empty || read('--globe-chart-empty-color') || '#eef6fc',
			low,
			high,
			border: read('--globe-chart-border-color') || 'rgba(30, 55, 85, 0.4)',
			legendBg: read('--globe-chart-legend-bg') || 'rgba(255,255,255,0.94)',
			legendFg: read('--globe-chart-legend-fg') || '#121826',
			legendMuted: read('--globe-chart-legend-muted') || '#5c6b7a',
		};
	}

	private motionMs(ms: number, kind: 'polygon' | 'camera' = 'polygon'): number {
		if (!this.animated) return 0;
		if (kind === 'camera' && !this.animateNavigation) return 0;
		if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return 0;
		}
		return ms;
	}

	private notify(input: {
		level: FeedbackEventDetail['level'];
		title: string;
		body: string;
		details?: string;
		code?: string;
		once?: boolean;
	}) {
		const persist =
			input.level === 'error' ||
			(input.level === 'warning' && this.resolvedConfig.toasts.persistWarnings);

		this.toastState = pushToast(this.toastState, {
			...input,
			persist,
			maxVisible: this.resolvedConfig.toasts.maxVisible,
		});

		const latest = this.toastState.items[this.toastState.items.length - 1];
		if (!latest) return;

		const detail: FeedbackEventDetail = {
			level: latest.level,
			title: latest.title,
			body: latest.body,
			...definedProps({ details: latest.details, code: input.code }),
		};
		if (latest.level === 'error') {
			this.dispatchEvent(new CustomEvent('error', { detail, bubbles: true, composed: true }));
		} else if (latest.level === 'warning') {
			this.dispatchEvent(new CustomEvent('warning', { detail, bubbles: true, composed: true }));
		}

		if (!persist && latest.level !== 'error') {
			const ms = this.resolvedConfig.toasts.warningDismissMs;
			clearTimeout(this.warningTimers.get(latest.id));
			this.warningTimers.set(
				latest.id,
				setTimeout(() => this.onDismissToast(latest.id), ms),
			);
		}
	}

	private onDismissToast(id: string) {
		clearTimeout(this.warningTimers.get(id));
		this.warningTimers.delete(id);
		this.toastState = dismissToast(this.toastState, id);
		if (this.expandedToastId === id) this.expandedToastId = null;
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
		this.colorSchemeMq?.removeEventListener('change', this.onColorSchemeChange);
		this.colorSchemeMq = undefined;
		this.legendBreakpointMq?.removeEventListener('change', this.onLegendBreakpointChange);
		this.legendBreakpointMq = undefined;
		this.createGeneration += 1;
		this.globeCreating = false;
		this.hasPaintedPolygons = false;
		this.polygonClickBound = false;
		this.hasCentered = false;
		this.readyDispatched = false;
		this.visibleEnough = typeof IntersectionObserver === 'undefined';
		this.visibilityObserver?.disconnect();
		this.visibilityObserver = undefined;
		clearTimeout(this.revealTimer);
		clearTimeout(this.searchDebounceTimer);
		this.searchAbort?.abort();
		for (const timer of this.warningTimers.values()) clearTimeout(timer);
		this.warningTimers.clear();
		this.toastState = clearToasts(this.toastState);
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
