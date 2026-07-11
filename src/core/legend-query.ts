import type { LegendEntry } from './types.js';

export function filterLegendEntries(entries: LegendEntry[], query: string): LegendEntry[] {
	const q = query.trim().toLowerCase();
	if (!q) return entries;
	return entries.filter(
		(entry) =>
			entry.name.toLowerCase().includes(q) ||
			entry.iso.toLowerCase().includes(q) ||
			String(entry.value).includes(q),
	);
}

export interface PageSlice<T> {
	items: T[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
	if (!pageSize || pageSize <= 0) {
		return {
			items,
			page: 1,
			pageSize: 0,
			totalItems: items.length,
			totalPages: 1,
		};
	}

	const totalItems = items.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const safePage = Math.min(Math.max(1, page), totalPages);
	const start = (safePage - 1) * pageSize;
	return {
		items: items.slice(start, start + pageSize),
		page: safePage,
		pageSize,
		totalItems,
		totalPages,
	};
}

export function mergeLegendByIso(base: LegendEntry[], extra: LegendEntry[]): LegendEntry[] {
	const map = new Map<string, LegendEntry>();
	for (const entry of base) map.set(entry.iso, entry);
	for (const entry of extra) {
		const prev = map.get(entry.iso);
		map.set(entry.iso, prev ? { ...prev, ...entry, color: entry.color || prev.color } : entry);
	}
	return [...map.values()].sort((a, b) => b.value - a.value);
}
