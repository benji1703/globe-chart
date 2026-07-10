import type { DataRow, PointOfView } from './types.js';

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
	formatValue?: (value: number, row?: DataRow) => string;
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
		row?: DataRow;
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

const COLLAPSE_MODES = ['never', 'always', 'mobile'] as const;
const SEARCH_MODES = ['local', 'remote', 'hybrid'] as const;
const TOAST_POSITIONS = ['bottom-end', 'bottom-start', 'top-end', 'top-start'] as const;
const LEGEND_POSITIONS = ['left', 'right'] as const;

export interface ConfigMergeResult {
	config: GlobeChartConfig;
	unknownKeys: string[];
	invalid: boolean;
	/** Nested fields that were present but coerced/ignored due to wrong type. */
	invalidPaths: string[];
}

export function mergeConfig(input?: unknown): ConfigMergeResult {
	if (input == null) {
		return {
			config: cloneConfig(DEFAULT_CONFIG),
			unknownKeys: [],
			invalid: false,
			invalidPaths: [],
		};
	}

	if (typeof input !== 'object' || Array.isArray(input)) {
		return {
			config: cloneConfig(DEFAULT_CONFIG),
			unknownKeys: [],
			invalid: true,
			invalidPaths: [],
		};
	}

	const raw = input as Record<string, unknown>;
	const unknownKeys = Object.keys(raw).filter((key) => !KNOWN_ROOT_KEYS.has(key));
	const partial = raw as GlobeChartConfigInput;
	const invalidPaths: string[] = [];

	const config = cloneConfig(DEFAULT_CONFIG);

	if (partial.legend) {
		const { search, collapseOnSelect, ...legendRest } = partial.legend;
		assignLegendScalars(config.legend, legendRest, invalidPaths);
		if (search) assignSearch(config.legend.search, search, invalidPaths);
		if (collapseOnSelect !== undefined) {
			if (
				typeof collapseOnSelect === 'string' &&
				!COLLAPSE_MODES.includes(collapseOnSelect as LegendCollapseOnSelect)
			) {
				invalidPaths.push('legend.collapseOnSelect');
			}
			config.legend.collapseOnSelect = normalizeCollapseOnSelect(collapseOnSelect);
		}
	}
	if (partial.colors) Object.assign(config.colors, pickDefined(partial.colors));
	if (partial.labels) Object.assign(config.labels, pickDefined(partial.labels));
	if (partial.globe) assignGlobe(config.globe, partial.globe, invalidPaths);
	if (partial.toasts) assignToasts(config.toasts, partial.toasts, invalidPaths);

	if (partial.camera) {
		const { initial, jumpAltitude, durations } = partial.camera;
		if (initial) Object.assign(config.camera.initial, pickDefined(initial));
		if (jumpAltitude != null) {
			if (typeof jumpAltitude === 'number' && Number.isFinite(jumpAltitude)) {
				config.camera.jumpAltitude = jumpAltitude;
			} else {
				invalidPaths.push('camera.jumpAltitude');
			}
		}
		if (durations) assignDurations(config.camera.durations, durations, invalidPaths);
	}

	return { config, unknownKeys, invalid: false, invalidPaths };
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

function assignLegendScalars(
	target: LegendConfig,
	input: Partial<Omit<LegendConfig, 'search' | 'collapseOnSelect' | 'formatValue'>>,
	invalidPaths: string[],
) {
	const next = pickDefined(input);
	if (next.collapseMode !== undefined) {
		if (COLLAPSE_MODES.includes(next.collapseMode as LegendCollapseMode)) {
			target.collapseMode = next.collapseMode as LegendCollapseMode;
		} else {
			invalidPaths.push('legend.collapseMode');
		}
		delete next.collapseMode;
	}
	if (next.position !== undefined) {
		if (LEGEND_POSITIONS.includes(next.position as 'left' | 'right')) {
			target.position = next.position as 'left' | 'right';
		} else {
			invalidPaths.push('legend.position');
		}
		delete next.position;
	}
	if (next.pageSize !== undefined) {
		if (typeof next.pageSize === 'number' && Number.isFinite(next.pageSize)) {
			target.pageSize = next.pageSize;
		} else {
			invalidPaths.push('legend.pageSize');
		}
		delete next.pageSize;
	}
	for (const key of ['showScale', 'showCount', 'collapsible'] as const) {
		if (next[key] !== undefined && typeof next[key] !== 'boolean') {
			invalidPaths.push(`legend.${key}`);
			delete next[key];
		}
	}
	Object.assign(target, next);
}

function assignSearch(
	target: LegendSearchConfig,
	input: Partial<LegendSearchConfig>,
	invalidPaths: string[],
) {
	const next = pickDefined(input);
	if (next.mode !== undefined) {
		if (SEARCH_MODES.includes(next.mode as LegendSearchMode)) {
			target.mode = next.mode as LegendSearchMode;
		} else {
			invalidPaths.push('legend.search.mode');
		}
		delete next.mode;
	}
	for (const key of ['debounceMs', 'minLength'] as const) {
		if (next[key] !== undefined) {
			if (typeof next[key] === 'number' && Number.isFinite(next[key] as number)) {
				target[key] = next[key] as number;
			} else {
				invalidPaths.push(`legend.search.${key}`);
			}
			delete next[key];
		}
	}
	if (next.enabled !== undefined && typeof next.enabled !== 'boolean') {
		invalidPaths.push('legend.search.enabled');
		delete next.enabled;
	}
	Object.assign(target, next);
}

function assignToasts(
	target: ToastsConfig,
	input: Partial<ToastsConfig>,
	invalidPaths: string[],
) {
	const next = pickDefined(input);
	if (next.position !== undefined) {
		if (TOAST_POSITIONS.includes(next.position as ToastPosition)) {
			target.position = next.position as ToastPosition;
		} else {
			invalidPaths.push('toasts.position');
		}
		delete next.position;
	}
	if (next.maxVisible !== undefined) {
		if (typeof next.maxVisible === 'number' && Number.isFinite(next.maxVisible)) {
			target.maxVisible = next.maxVisible;
		} else {
			invalidPaths.push('toasts.maxVisible');
		}
		delete next.maxVisible;
	}
	if (next.warningDismissMs !== undefined) {
		if (typeof next.warningDismissMs === 'number' && Number.isFinite(next.warningDismissMs)) {
			target.warningDismissMs = next.warningDismissMs;
		} else {
			invalidPaths.push('toasts.warningDismissMs');
		}
		delete next.warningDismissMs;
	}
	Object.assign(target, next);
}

function assignGlobe(
	target: GlobeVisualConfig,
	input: Partial<GlobeVisualConfig>,
	invalidPaths: string[],
) {
	const next = pickDefined(input);
	for (const key of [
		'atmosphereAltitude',
		'curvatureDeg',
		'polygonAltitude',
		'loadingRotateSpeed',
		'autoRotateDirection',
	] as const) {
		if (next[key] !== undefined && typeof next[key] !== 'number') {
			invalidPaths.push(`globe.${key}`);
			delete next[key];
		}
	}
	Object.assign(target, next);
}

function assignDurations(
	target: CameraConfig['durations'],
	input: Partial<CameraConfig['durations']>,
	invalidPaths: string[],
) {
	const next = pickDefined(input);
	for (const key of ['navigate', 'reveal', 'polygon'] as const) {
		if (next[key] !== undefined) {
			if (typeof next[key] === 'number' && Number.isFinite(next[key] as number)) {
				target[key] = next[key] as number;
			} else {
				invalidPaths.push(`camera.durations.${key}`);
			}
		}
	}
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
