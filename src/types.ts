export interface GeoFeature {
	properties: Record<string, string | number | null>;
	geometry?: { type: string; coordinates: unknown };
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

export interface SkippedRow {
	index: number;
	reason: 'missing-iso' | 'non-numeric' | 'empty-iso';
	raw?: unknown;
}

export interface ValueIndexResult {
	valueMap: Record<string, number>;
	rowByIso: Record<string, DataRow>;
	maxValue: number;
	skipped: SkippedRow[];
	validCount: number;
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
