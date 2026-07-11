import { css } from 'lit';

import { darkTokens, lightTokens } from './tokens.js';

export const hostStyles = css`
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
