import type { PointOfView } from './types.js';

export type ToastPosition = 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';

export type LegendSearchMode = 'local' | 'remote' | 'hybrid';

/** Hit returned by a remote legend search provider (or `legendResults` property). */
export interface LegendSearchHit {
	iso: string;
	name?: string;
	value?: number;
}

export interface LegendSearchConfig {
	enabled: boolean;
	mode: LegendSearchMode;
	placeholder: string;
	debounceMs: number;
	/** Minimum characters before remote/hybrid providers run (local still filters at 1+). */
	minLength: number;
	/**
	 * Backend search. Receives an AbortSignal so in-flight requests cancel on new keystrokes.
	 * Also mirrored as a `legend-search` DOM event for hosts that prefer events over callbacks.
	 */
	provider?: (query: string, signal: AbortSignal) => Promise<LegendSearchHit[]>;
}

export type LegendCollapseMode = 'never' | 'always' | 'mobile';

/** When the open legend panel collapses after selecting a country. */
export type LegendCollapseOnSelect = 'never' | 'mobile' | 'always';

export interface LegendConfig {
	title: string;
	subtitle: string;
	showScale: boolean;
	showCount: boolean;
	emptyLabel: string;
	position: 'left' | 'right';
	/** Page size for the legend list. `0` disables paging (scroll the full list). */
	pageSize: number;
	/**
	 * Max height of the legend panel (CSS length), e.g. `'280px'`, `'45%'`.
	 * Default keeps a compact panel instead of stretching full globe height.
	 */
	maxHeight: string;
	/**
	 * Show a toggle control to open/close the legend.
	 * When enabled with `collapseMode: 'mobile'`, the panel starts as a button on small screens.
	 */
	collapsible: boolean;
	/**
	 * When the legend starts collapsed (only if `collapsible`):
	 * - `never` — panel open by default
	 * - `always` — button by default on all viewports
	 * - `mobile` — button below `mobileBreakpoint`, open on larger screens (default)
	 */
	collapseMode: LegendCollapseMode;
	/**
	 * Collapse the panel after selecting a country (legend row or polygon):
	 * - `never` — keep the panel open (desktop-friendly)
	 * - `mobile` — only collapse on small screens (default)
	 * - `always` — always collapse back to the toggle (opt-in)
	 */
	collapseOnSelect: LegendCollapseOnSelect;
	/** CSS media query used when `collapseMode` / `collapseOnSelect` is `mobile`. */
	mobileBreakpoint: string;
	/** Label on the collapsed toggle button. */
	toggleLabel: string;
	search: LegendSearchConfig;
	formatValue?: (value: number, row?: Record<string, unknown>) => string;
}

export interface ColorsConfig {
	ocean?: string;
	empty?: string;
	low?: string;
	high?: string;
	stroke?: string;
}

export interface LabelsConfig {
	tooltip?: (ctx: {
		iso: string;
		name: string;
		value: number;
		color: string;
		row?: Record<string, unknown>;
	}) => string;
}

export interface CameraConfig {
	initial: PointOfView;
	jumpAltitude: number;
	durations: {
		navigate: number;
		reveal: number;
		polygon: number;
	};
}

export interface GlobeVisualConfig {
	atmosphereAltitude: number;
	strokeColor: string;
	curvatureDeg: number;
	polygonAltitude: number;
	loadingRotateSpeed: number;
	autoRotateDirection: number;
}

export interface ToastsConfig {
	enabled: boolean;
	position: ToastPosition;
	maxVisible: number;
	persistWarnings: boolean;
	warningDismissMs: number;
}

export interface GlobeChartConfig {
	legend: LegendConfig;
	colors: ColorsConfig;
	labels: LabelsConfig;
	camera: CameraConfig;
	globe: GlobeVisualConfig;
	toasts: ToastsConfig;
}

export type GlobeChartConfigInput = {
	legend?: Partial<Omit<LegendConfig, 'search' | 'collapseOnSelect'>> & {
		search?: Partial<LegendSearchConfig>;
		/** Prefer `'mobile' | 'never' | 'always'`. Booleans map: `true` → `'always'`, `false` → `'never'`. */
		collapseOnSelect?: LegendCollapseOnSelect | boolean;
	};
	colors?: ColorsConfig;
	labels?: LabelsConfig;
	camera?: {
		initial?: Partial<PointOfView>;
		jumpAltitude?: number;
		durations?: Partial<CameraConfig['durations']>;
	};
	globe?: Partial<GlobeVisualConfig>;
	toasts?: Partial<ToastsConfig>;
};

export const DEFAULT_CONFIG: GlobeChartConfig = {
	legend: {
		title: 'By country',
		subtitle: '',
		showScale: true,
		showCount: true,
		emptyLabel: 'No data',
		position: 'left',
		pageSize: 0,
		maxHeight: 'min(360px, calc(100% - 24px))',
		collapsible: true,
		collapseMode: 'mobile',
		collapseOnSelect: 'mobile',
		mobileBreakpoint: '(max-width: 768px)',
		toggleLabel: 'Legend',
		search: {
			enabled: false,
			mode: 'local',
			placeholder: 'Search countries…',
			debounceMs: 250,
			minLength: 1,
		},
	},
	colors: {},
	labels: {},
	camera: {
		initial: { lat: 20, lng: -30, altitude: 1.5 },
		jumpAltitude: 1.15,
		durations: {
			navigate: 1200,
			reveal: 1800,
			polygon: 900,
		},
	},
	globe: {
		atmosphereAltitude: 0.12,
		strokeColor: 'rgba(30, 55, 85, 0.4)',
		curvatureDeg: 1,
		polygonAltitude: 0,
		loadingRotateSpeed: 1.5,
		autoRotateDirection: -1,
	},
	toasts: {
		enabled: true,
		position: 'bottom-end',
		maxVisible: 3,
		persistWarnings: false,
		warningDismissMs: 8000,
	},
};

const KNOWN_ROOT_KEYS = new Set(['legend', 'colors', 'labels', 'camera', 'globe', 'toasts']);

export interface ConfigMergeResult {
	config: GlobeChartConfig;
	unknownKeys: string[];
	invalid: boolean;
}

export function mergeConfig(input?: unknown): ConfigMergeResult {
	if (input == null) {
		return { config: cloneConfig(DEFAULT_CONFIG), unknownKeys: [], invalid: false };
	}

	if (typeof input !== 'object' || Array.isArray(input)) {
		return { config: cloneConfig(DEFAULT_CONFIG), unknownKeys: [], invalid: true };
	}

	const raw = input as Record<string, unknown>;
	const unknownKeys = Object.keys(raw).filter((key) => !KNOWN_ROOT_KEYS.has(key));
	const partial = raw as GlobeChartConfigInput;

	const config = cloneConfig(DEFAULT_CONFIG);

	if (partial.legend) {
		const { search, collapseOnSelect, ...legendRest } = partial.legend;
		Object.assign(config.legend, pickDefined(legendRest));
		if (search) Object.assign(config.legend.search, pickDefined(search));
		if (collapseOnSelect !== undefined) {
			config.legend.collapseOnSelect = normalizeCollapseOnSelect(collapseOnSelect);
		}
	}
	if (partial.colors) Object.assign(config.colors, pickDefined(partial.colors));
	if (partial.labels) Object.assign(config.labels, pickDefined(partial.labels));
	if (partial.globe) Object.assign(config.globe, pickDefined(partial.globe));
	if (partial.toasts) Object.assign(config.toasts, pickDefined(partial.toasts));

	if (partial.camera) {
		const { initial, jumpAltitude, durations } = partial.camera;
		if (initial) Object.assign(config.camera.initial, pickDefined(initial));
		if (jumpAltitude != null) config.camera.jumpAltitude = jumpAltitude;
		if (durations) Object.assign(config.camera.durations, pickDefined(durations));
	}

	return { config, unknownKeys, invalid: false };
}

/** Normalize public `collapseOnSelect` input (including legacy booleans). */
export function normalizeCollapseOnSelect(
	value: LegendCollapseOnSelect | boolean,
): LegendCollapseOnSelect {
	if (value === true) return 'always';
	if (value === false) return 'never';
	if (value === 'never' || value === 'mobile' || value === 'always') return value;
	return 'mobile';
}

function pickDefined<T extends object>(obj: T): Partial<T> {
	const out: Partial<T> = {};
	for (const [key, value] of Object.entries(obj) as [keyof T, T[keyof T]][]) {
		if (value !== undefined) out[key] = value;
	}
	return out;
}

function cloneConfig(config: GlobeChartConfig): GlobeChartConfig {
	return {
		legend: {
			...config.legend,
			search: { ...config.legend.search },
		},
		colors: { ...config.colors },
		labels: { ...config.labels },
		camera: {
			initial: { ...config.camera.initial },
			jumpAltitude: config.camera.jumpAltitude,
			durations: { ...config.camera.durations },
		},
		globe: { ...config.globe },
		toasts: { ...config.toasts },
	};
}
