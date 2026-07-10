import type { DataRow, SkippedRow, ValueIndexResult } from './types.js';

export interface ValueIndexOptions {
	data: DataRow[];
	isoField: string;
	valueField: string;
}

export interface ParseDataRowsResult {
	rows: DataRow[];
	invalid: boolean;
	/** Non-object entries that were dropped before indexing. */
	dropped: number;
}

/**
 * Coerce host `data` into a row array. Non-arrays yield `invalid` + empty rows.
 * Non-object elements are dropped (counted in `dropped`).
 */
export function parseDataRows(input: unknown): ParseDataRowsResult {
	if (input == null) {
		return { rows: [], invalid: false, dropped: 0 };
	}
	if (!Array.isArray(input)) {
		return { rows: [], invalid: true, dropped: 0 };
	}

	const rows: DataRow[] = [];
	let dropped = 0;
	for (const item of input) {
		if (item != null && typeof item === 'object' && !Array.isArray(item)) {
			rows.push(item as DataRow);
		} else {
			dropped += 1;
		}
	}
	return { rows, invalid: false, dropped };
}

export function buildValueIndex(options: ValueIndexOptions): ValueIndexResult {
	const { data, isoField, valueField } = options;
	const valueMap: Record<string, number> = {};
	const rowByIso: Record<string, DataRow> = {};
	const skipped: SkippedRow[] = [];

	data.forEach((row, index) => {
		const rawIso = row[isoField];
		if (rawIso == null || String(rawIso).trim() === '') {
			skipped.push({ index, reason: 'missing-iso', raw: rawIso });
			return;
		}

		const iso = String(rawIso).trim().toUpperCase();
		if (!iso) {
			skipped.push({ index, reason: 'empty-iso', raw: rawIso });
			return;
		}

		const rawValue = row[valueField];
		const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
		if (!Number.isFinite(value)) {
			skipped.push({ index, reason: 'non-numeric', raw: rawValue });
			return;
		}

		valueMap[iso] = value;
		rowByIso[iso] = row;
	});

	const values = Object.values(valueMap);
	return {
		valueMap,
		rowByIso,
		maxValue: values.length ? Math.max(...values, 1) : 1,
		skipped,
		validCount: values.length,
	};
}
