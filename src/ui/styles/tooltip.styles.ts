import { css } from 'lit';

import { glassPanel } from './tokens.js';

export const tooltipStyles = css`
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
		color: var(--globe-chart-legend-fg);
		font-family: var(--globe-chart-font);
		font-size: 13px;
		line-height: 1.3;
		${glassPanel}
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
`;
