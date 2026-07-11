import { css } from 'lit';

import { glassPanel, mutedHoverBg } from './tokens.js';

export const toastStyles = css`
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
		color: var(--globe-chart-legend-fg);
		border-left: 3px solid var(--globe-chart-border-color);
		animation: toast-in 220ms ease both;
		${glassPanel}
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
		${mutedHoverBg}
	}

	.toast__btn--dismiss {
		color: var(--globe-chart-legend-muted);
	}
`;
