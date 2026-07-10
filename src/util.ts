/** Narrow `unknown` to a member of a string-literal union. */
export function isOneOf<const T extends string>(
	value: unknown,
	allowed: readonly T[],
): value is T {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Read a DOMStringMap key without index-signature property access. */
export function datasetGet(el: HTMLElement, key: string): string | undefined {
	return el.dataset[key];
}

export function datasetSet(el: HTMLElement, key: string, value: string): void {
	el.dataset[key] = value;
}

export function isDemoTheme(value: unknown): value is 'light' | 'dark' {
	return value === 'light' || value === 'dark';
}

export function isLegendSide(value: unknown): value is 'left' | 'right' {
	return value === 'left' || value === 'right';
}
