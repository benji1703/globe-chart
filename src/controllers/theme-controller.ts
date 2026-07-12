import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { ColorsConfig } from '../core/config.js';
import type { ThemeColors } from '../core/types.js';

/** Light-theme fallbacks, used when CSS custom properties are not resolvable (SSR). */
const FALLBACK = {
	ocean: '#c8e0f5',
	empty: '#eef6fc',
	low: '#f5c518',
	high: '#c41e1e',
	border: 'rgba(30, 55, 85, 0.4)',
	legendBg: 'rgba(255,255,255,0.94)',
	legendFg: '#121826',
	legendMuted: '#5c6b7a',
} satisfies ThemeColors;

/** Resolves choropleth theme colors from config + CSS custom properties, and tracks OS theme changes. */
export class ThemeController implements ReactiveController {
	private mq: MediaQueryList | undefined;
	private readonly host: ReactiveControllerHost & HTMLElement;
	private readonly onChangeCb: () => void;
	private readonly onChange = () => this.onChangeCb();

	constructor(host: ReactiveControllerHost & HTMLElement, onChange: () => void) {
		this.host = host;
		this.onChangeCb = onChange;
		host.addController(this);
	}

	hostConnected() {
		if (typeof matchMedia === 'function') {
			this.mq = matchMedia('(prefers-color-scheme: dark)');
			this.mq.addEventListener('change', this.onChange);
		}
	}

	hostDisconnected() {
		this.mq?.removeEventListener('change', this.onChange);
		this.mq = undefined;
	}

	resolve(config: ColorsConfig): ThemeColors {
		// SSR (Lit server render): no computed styles — config wins, then light-theme defaults.
		if (typeof getComputedStyle !== 'function') {
			return {
				...FALLBACK,
				...(config.ocean ? { ocean: config.ocean } : null),
				...(config.empty ? { empty: config.empty } : null),
				...(config.low ? { low: config.low } : null),
				...(config.high ? { high: config.high } : null),
			};
		}

		const style = getComputedStyle(this.host);
		const read = (name: string) => style.getPropertyValue(name).trim();
		const low = config.low || read('--globe-chart-low-color') || FALLBACK.low;
		const high =
			config.high ||
			read('--globe-chart-high-color') ||
			read('--globe-chart-land-color') ||
			FALLBACK.high;

		return {
			ocean: config.ocean || read('--globe-chart-ocean-color') || FALLBACK.ocean,
			empty: config.empty || read('--globe-chart-empty-color') || FALLBACK.empty,
			low,
			high,
			border: read('--globe-chart-border-color') || FALLBACK.border,
			legendBg: read('--globe-chart-legend-bg') || FALLBACK.legendBg,
			legendFg: read('--globe-chart-legend-fg') || FALLBACK.legendFg,
			legendMuted: read('--globe-chart-legend-muted') || FALLBACK.legendMuted,
		};
	}
}
