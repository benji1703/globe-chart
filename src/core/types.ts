/** Known Natural Earth / packed-topo property keys used by this library. */
export interface CountryProperties {
	i?: string | number | null;
	n?: string | number | null;
	ISO_A2?: string | number | null;
	ISO_A3?: string | number | null;
	ADM0_A3?: string | number | null;
	WB_A2?: string | number | null;
	WB_A3?: string | number | null;
	ADMIN?: string | number | null;
	NAME?: string | number | null;
	[key: string]: string | number | null | undefined;
}

export type GeoPosition = [number, number] | [number, number, number];
export type GeoLinearRing = GeoPosition[];
export type GeoPolygonCoords = GeoLinearRing[];
export type GeoMultiPolygonCoords = GeoPolygonCoords[];

export type GeoGeometry =
	| { type: 'Polygon'; coordinates: GeoPolygonCoords }
	| { type: 'MultiPolygon'; coordinates: GeoMultiPolygonCoords }
	| { type: string; coordinates: unknown };

export interface GeoFeature {
	type?: 'Feature';
	properties: CountryProperties;
	geometry?: GeoGeometry;
}

/**
 * Minimum shape for choropleth rows. Extra fields are allowed and passed through
 * to tooltips / legend callbacks via the index signature.
 */
export interface DataRow {
	iso?: unknown;
	value?: unknown;
	name?: unknown;
	[key: string]: unknown;
}

export interface ThemeColors {
	ocean: string;
	empty: string;
	low: string;
	high: string;
	border: string;
	legendBg: string;
	legendFg: string;
	legendMuted: string;
}

export interface LegendEntry {
	iso: string;
	name: string;
	value: number;
	color: string;
	lat: number;
	lng: number;
	row?: DataRow;
}

export interface PointOfView {
	lat: number;
	lng: number;
	altitude: number;
}

export type ToastLevel = 'error' | 'warning' | 'info';

export interface ToastMessage {
	id: string;
	level: ToastLevel;
	title: string;
	body: string;
	details?: string;
	createdAt: number;
	persist: boolean;
}

export type SkipReason = 'missing-iso' | 'non-numeric' | 'empty-iso';

export interface SkippedRow {
	index: number;
	reason: SkipReason;
	raw?: unknown;
}

export interface ValueIndexResult {
	readonly valueMap: Readonly<Record<string, number>>;
	readonly rowByIso: Readonly<Record<string, DataRow>>;
	readonly maxValue: number;
	readonly skipped: readonly SkippedRow[];
	readonly validCount: number;
}

export interface CountryEventDetail {
	iso: string;
	name: string;
	value: number;
	color: string;
	lat?: number;
	lng?: number;
	row?: DataRow;
}

export interface FeedbackEventDetail {
	level: ToastLevel;
	title: string;
	body: string;
	details?: string;
	code?: string;
}

export interface LegendSearchEventDetail {
	query: string;
	signal: AbortSignal;
}

/** Typed custom events emitted by `<globe-chart>`. */
export interface GlobeChartEventMap {
	ready: CustomEvent<undefined>;
	'country-select': CustomEvent<CountryEventDetail>;
	/** `detail` is `null` when the pointer leaves the last hovered country. */
	'country-hover': CustomEvent<CountryEventDetail | null>;
	'legend-search': CustomEvent<LegendSearchEventDetail>;
	'globe-error': CustomEvent<FeedbackEventDetail>;
	'globe-warning': CustomEvent<FeedbackEventDetail>;
}

export function assertNever(value: never, message = 'Unexpected value'): never {
	throw new Error(`${message}: ${String(value)}`);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function isDataRow(value: unknown): value is DataRow {
	return isRecord(value);
}

export function isGeoFeature(value: unknown): value is GeoFeature {
	if (!isRecord(value)) return false;
	const props = value['properties'];
	return props != null && typeof props === 'object' && !Array.isArray(props);
}

/** Keys kept only when the value is not `undefined` (exactOptionalPropertyTypes-safe). */
export type DefinedProps<T> = {
	[K in keyof T as undefined extends T[K]
		? T[K] extends undefined
			? never
			: K
		: K]?: Exclude<T[K], undefined>;
};

/** Build an object omitting keys whose value is `undefined` (EOPT-safe). */
export function definedProps<T extends object>(obj: T): DefinedProps<T> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		if (value !== undefined) out[key] = value;
	}
	return out as DefinedProps<T>;
}
