export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function formatValue(value: number, emptyLabel = 'No data'): string {
	if (!value) return emptyLabel;
	return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
