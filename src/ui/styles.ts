import { css } from 'lit';

/** Default choropleth tokens — clear blue sea, yellow→red scale. */
const lightTokens = css`
	--globe-chart-ocean-color: #c8e0f5;
	--globe-chart-empty-color: #eef6fc;
	--globe-chart-low-color: #f5c518;
	--globe-chart-high-color: #c41e1e;
	--globe-chart-risk-low-color: var(--globe-chart-low-color);
	--globe-chart-risk-high-color: var(--globe-chart-high-color);
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

const darkTokens = css`
	--globe-chart-ocean-color: #0a1e36;
	--globe-chart-empty-color: #16324a;
	--globe-chart-low-color: #f5d04a;
	--globe-chart-high-color: #ff4d4d;
	--globe-chart-risk-low-color: var(--globe-chart-low-color);
	--globe-chart-risk-high-color: var(--globe-chart-high-color);
	--globe-chart-land-color: var(--globe-chart-high-color);
	--globe-chart-border-color: rgba(160, 200, 240, 0.35);
	--globe-chart-legend-bg: rgba(8, 16, 28, 0.94);
	--globe-chart-legend-fg: #e8f0f8;
	--globe-chart-legend-muted: #8aa0b5;
	color-scheme: dark;
`;

export const globeChartStyles = css`
	:host {
		display: block;
		position: relative;
		width: 100%;
		height: 100%;
		--globe-chart-font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-family: var(--globe-chart-font);
		font-size: 13px;
		${lightTokens}
	}

	/* Auto: follow OS, unless theme is forced light */
	@media (prefers-color-scheme: dark) {
		:host(:not([theme='light'])) {
			${darkTokens}
		}
	}

	:host([theme='dark']) {
		${darkTokens}
	}

	:host([theme='light']) {
		${lightTokens}
	}

	.globe-area {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.float-tooltip-kap {
		position: absolute;
		z-index: 3;
		width: max-content;
		max-width: min(280px, 70%);
		pointer-events: none;
		padding: 0;
		border-radius: 0;
		background: transparent;
		color: var(--globe-chart-legend-fg);
		font-family: var(--globe-chart-font);
		font-size: 13px;
		line-height: 1.3;
	}

	.globe-tip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		box-sizing: border-box;
		padding: 7px 10px;
		border-radius: 8px;
		background: var(--globe-chart-legend-bg);
		color: var(--globe-chart-legend-fg);
		font-family: var(--globe-chart-font);
		font-size: 13px;
		line-height: 1.3;
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.12),
			0 1px 3px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.globe-tip__swatch {
		flex: 0 0 auto;
		width: 12px;
		height: 12px;
		border-radius: 3px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
	}

	.globe-tip__name {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.globe-tip__value {
		flex: 0 0 auto;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
		color: var(--globe-chart-legend-muted);
	}

	.legend {
		position: absolute;
		top: 12px;
		left: 12px;
		bottom: auto;
		z-index: 2;
		width: min(280px, calc(100% - 24px));
		max-height: var(--globe-chart-legend-max-height);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		font-family: var(--globe-chart-font);
		font-size: 13px;
		color: var(--globe-chart-legend-fg);
		background: var(--globe-chart-legend-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 12px;
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.12),
			0 1px 3px rgba(0, 0, 0, 0.08);
		animation: legend-fade 280ms ease both;
	}

	@keyframes legend-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	:host([legend-position='right']) .legend,
	:host([legend-position='right']) .legend-toggle {
		left: auto;
		right: 12px;
	}

	.legend-toggle {
		position: absolute;
		top: 12px;
		left: 12px;
		z-index: 2;
		appearance: none;
		border: none;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 10px 14px;
		border-radius: 999px;
		color: var(--globe-chart-legend-fg);
		background: var(--globe-chart-legend-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow:
			0 2px 12px rgba(0, 0, 0, 0.12),
			0 1px 3px rgba(0, 0, 0, 0.08);
		animation: legend-fade 280ms ease both;
	}

	.legend-toggle:hover,
	.legend-toggle:focus-visible {
		outline: none;
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, var(--globe-chart-legend-bg));
	}

	.legend-header {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex-shrink: 0;
	}

	.legend-header__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.legend-close {
		appearance: none;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		color: var(--globe-chart-legend-muted);
		padding: 4px 6px;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.legend-close:hover,
	.legend-close:focus-visible {
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, transparent);
		color: var(--globe-chart-legend-fg);
		outline: none;
	}

	.legend-title {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--globe-chart-legend-muted);
	}

	.legend-subtitle {
		font-size: 12px;
		color: var(--globe-chart-legend-muted);
	}

	.legend-scale {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--globe-chart-legend-muted);
		letter-spacing: 0.02em;
	}

	.legend-scale-bar {
		flex: 1;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--globe-chart-low-color), var(--globe-chart-high-color));
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	.legend-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.legend-row {
		display: grid;
		grid-template-columns: 12px minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 5px 7px;
		border: none;
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
		text-align: left;
		transition:
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.legend-row:hover,
	.legend-row:focus-visible {
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, transparent);
		outline: none;
	}

	.legend-row[aria-current='true'] {
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 12%, transparent);
	}

	.legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
	}

	.legend-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.legend-value {
		font-variant-numeric: tabular-nums;
		color: var(--globe-chart-legend-muted);
	}

	.legend-count {
		font-size: 11px;
		color: var(--globe-chart-legend-muted);
		text-align: center;
		flex-shrink: 0;
		padding-top: 4px;
		border-top: 1px solid color-mix(in srgb, var(--globe-chart-legend-muted) 20%, transparent);
	}

	.legend-search {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.legend-search__label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.legend-search__input {
		width: 100%;
		box-sizing: border-box;
		padding: 7px 9px;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--globe-chart-legend-muted) 35%, transparent);
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 4%, transparent);
		color: var(--globe-chart-legend-fg);
		font: inherit;
		font-size: 12px;
	}

	.legend-search__input:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--globe-chart-low-color) 70%, transparent);
		outline-offset: 1px;
	}

	.legend-search__status,
	.legend-search__error,
	.legend-empty {
		margin: 0;
		font-size: 12px;
		color: var(--globe-chart-legend-muted);
		padding: 6px 2px;
	}

	.legend-search__error {
		color: var(--globe-chart-high-color);
	}

	.legend-pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-shrink: 0;
	}

	.legend-pager__btn {
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--globe-chart-legend-muted) 30%, transparent);
		background: transparent;
		color: var(--globe-chart-legend-fg);
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		padding: 5px 9px;
		border-radius: 6px;
		cursor: pointer;
	}

	.legend-pager__btn:hover:not(:disabled),
	.legend-pager__btn:focus-visible:not(:disabled) {
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, transparent);
		outline: none;
	}

	.legend-pager__btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.legend-pager__meta {
		font-size: 11px;
		color: var(--globe-chart-legend-muted);
		font-variant-numeric: tabular-nums;
	}

	.toast-stack {
		position: absolute;
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: min(340px, calc(100% - 24px));
		pointer-events: none;
	}

	.toast-stack--bottom-end {
		right: 12px;
		bottom: 12px;
	}
	.toast-stack--bottom-start {
		left: 12px;
		bottom: 12px;
	}
	.toast-stack--top-end {
		right: 12px;
		top: 12px;
	}
	.toast-stack--top-start {
		left: 12px;
		top: 12px;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		border-radius: 10px;
		background: var(--globe-chart-legend-bg);
		color: var(--globe-chart-legend-fg);
		box-shadow:
			0 8px 28px rgba(0, 0, 0, 0.18),
			0 1px 3px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-left: 3px solid var(--globe-chart-border-color);
		animation: toast-in 220ms ease both;
	}

	.toast--error {
		border-left-color: var(--globe-chart-high-color);
	}
	.toast--warning {
		border-left-color: var(--globe-chart-low-color);
	}
	.toast--info {
		border-left-color: var(--globe-chart-border-color);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.toast__title {
		display: block;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 2px;
	}

	.toast__text {
		margin: 0;
		font-size: 12px;
		line-height: 1.4;
		color: var(--globe-chart-legend-muted);
	}

	.toast__details {
		margin: 8px 0 0;
		padding: 8px;
		max-height: 120px;
		overflow: auto;
		font-size: 11px;
		line-height: 1.35;
		border-radius: 6px;
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 6%, transparent);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.toast__actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.toast__btn {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--globe-chart-legend-fg);
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
	}

	.toast__btn:hover,
	.toast__btn:focus-visible {
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, transparent);
		outline: none;
	}

	.toast__btn--dismiss {
		color: var(--globe-chart-legend-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.legend,
		.legend-toggle,
		.legend-row,
		.toast {
			animation: none !important;
			transition: none !important;
		}
	}
`;
