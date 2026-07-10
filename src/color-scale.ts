import type { ThemeColors } from './types.js';

export function scaleT(value: number, maxValue: number): number {
	if (!value || maxValue <= 0) return 0;
	return Math.max(0, Math.min(1, value / maxValue));
}

export function scaleColor(value: number, maxValue: number, colors: ThemeColors): string {
	const t = scaleT(value, maxValue);
	if (t <= 0) return colors.empty;
	return interpolateHsl(colors.low, colors.high, t);
}

function interpolateHsl(fromHex: string, toHex: string, t: number): string {
	const from = hexToHsl(fromHex);
	const to = hexToHsl(toHex);
	if (!from || !to) return interpolateRgb(fromHex, toHex, t);

	const clamped = Math.max(0, Math.min(1, t));
	let dh = to.h - from.h;
	if (dh > 180) dh -= 360;
	if (dh < -180) dh += 360;

	const h = (from.h + dh * clamped + 360) % 360;
	const s = from.s + (to.s - from.s) * clamped;
	const l = from.l + (to.l - from.l) * clamped;
	return hslToHex(h, s, l);
}

function interpolateRgb(fromHex: string, toHex: string, t: number): string {
	const from = hexToRgb(fromHex);
	const to = hexToRgb(toHex);
	if (!from || !to) return fromHex;

	const clamped = Math.max(0, Math.min(1, t));
	const mix = (a: number, b: number) => Math.round(a + (b - a) * clamped);
	return rgbToHex(mix(from.r, to.r), mix(from.g, to.g), mix(from.b, to.b));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) return null;
	const n = parseInt(match[1], 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: l * 100 };

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	switch (max) {
		case r:
			h = (g - b) / d + (g < b ? 6 : 0);
			break;
		case g:
			h = (b - r) / d + 2;
			break;
		default:
			h = (r - g) / d + 4;
	}
	return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
	const S = s / 100;
	const L = l / 100;
	const C = (1 - Math.abs(2 * L - 1)) * S;
	const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = L - C / 2;
	let r = 0;
	let g = 0;
	let b = 0;
	if (h < 60) [r, g, b] = [C, X, 0];
	else if (h < 120) [r, g, b] = [X, C, 0];
	else if (h < 180) [r, g, b] = [0, C, X];
	else if (h < 240) [r, g, b] = [0, X, C];
	else if (h < 300) [r, g, b] = [X, 0, C];
	else [r, g, b] = [C, 0, X];
	return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}
