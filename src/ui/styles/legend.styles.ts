import { css } from 'lit';

import { focusRing, glassPanel, mutedHoverBg } from './tokens.js';

export const legendStyles = css`
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
		border-radius: 12px;
		animation: legend-fade 280ms ease both;
		${glassPanel}
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
		animation: legend-fade 280ms ease both;
		${glassPanel}
	}

	.legend-toggle:hover,
	.legend-toggle:focus-visible {
		${mutedHoverBg}
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
		color: var(--globe-chart-legend-fg);
		${mutedHoverBg}
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
		${mutedHoverBg}
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
		${focusRing}
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
		${mutedHoverBg}
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
`;
