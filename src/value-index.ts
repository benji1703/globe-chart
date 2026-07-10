import type { SkippedRow, ValueIndexResult } from './types.js';

export interface ValueIndexOptions {
	data: Record<string, unknown>[];
	isoField: string;
	valueField: string;
}

export function buildValueIndex(options: ValueIndexOptions): ValueIndexResult {
	const { data, isoField, valueField } = options;
	const valueMap: Record<string, number> = {};
	const rowByIso: Record<string, Record<string, unknown>> = {};
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
