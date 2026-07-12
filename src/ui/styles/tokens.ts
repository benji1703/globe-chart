import { css } from 'lit';

/** Frosted glass panel used by the legend, legend toggle, and toasts. */
export const glassPanel = css`
	background: var(--globe-chart-legend-bg);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	box-shadow:
		0 2px 12px rgba(0, 0, 0, 0.12),
		0 1px 3px rgba(0, 0, 0, 0.08);
`;

/** Focus outline for text inputs. */
export const focusRing = css`
	outline: 2px solid color-mix(in srgb, var(--globe-chart-low-color) 70%, transparent);
	outline-offset: 1px;
`;

/** Subtle hover/focus background used by rows and buttons. */
export const mutedHoverBg = css`
	outline: none;
	background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, transparent);
`;

/** Default choropleth tokens — clear blue sea, yellow→red scale. */
export const lightTokens = css`
	--globe-chart-ocean-color: #c8e0f5;
	--globe-chart-empty-color: #eef6fc;
	--globe-chart-low-color: #f5c518;
	--globe-chart-high-color: #c41e1e;
	--globe-chart-land-color: var(--globe-chart-high-color);
	--globe-chart-border-color: rgba(30, 55, 85, 0.4);
	--globe-chart-legend-bg: rgba(255, 255, 255, 0.94);
	--globe-chart-legend-fg: #121826;
	--globe-chart-legend-muted: #5c6b7a;
	--globe-chart-tooltip-bg: var(--globe-chart-legend-bg);
	--globe-chart-tooltip-fg: var(--globe-chart-legend-fg);
	--globe-chart-tooltip-accent: color-mix(in srgb, var(--globe-chart-legend-muted) 35%, transparent);
	--globe-chart-legend-max-height: min(360px, calc(100% - 24px));
	color-scheme: light;
`;

export const darkTokens = css`
	--globe-chart-ocean-color: #0a1e36;
	--globe-chart-empty-color: #16324a;
	--globe-chart-low-color: #f5d04a;
	--globe-chart-high-color: #ff4d4d;
	--globe-chart-land-color: var(--globe-chart-high-color);
	--globe-chart-border-color: rgba(160, 200, 240, 0.35);
	--globe-chart-legend-bg: rgba(8, 16, 28, 0.94);
	--globe-chart-legend-fg: #e8f0f8;
	--globe-chart-legend-muted: #8aa0b5;
	color-scheme: dark;
`;
