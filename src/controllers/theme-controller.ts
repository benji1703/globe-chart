import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { ColorsConfig } from '../core/config.js';
import type { ThemeColors } from '../core/types.js';

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
		const style = getComputedStyle(this.host);
		const read = (name: string) => style.getPropertyValue(name).trim();
		const low =
			config.low || read('--globe-chart-low-color') || read('--globe-chart-risk-low-color') || '#f5c518';
		const high =
			config.high ||
			read('--globe-chart-high-color') ||
			read('--globe-chart-risk-high-color') ||
			read('--globe-chart-land-color') ||
			'#c41e1e';

		return {
			ocean: config.ocean || read('--globe-chart-ocean-color') || '#c8e0f5',
			empty: config.empty || read('--globe-chart-empty-color') || '#eef6fc',
			low,
			high,
			border: read('--globe-chart-border-color') || 'rgba(30, 55, 85, 0.4)',
			legendBg: read('--globe-chart-legend-bg') || 'rgba(255,255,255,0.94)',
			legendFg: read('--globe-chart-legend-fg') || '#121826',
			legendMuted: read('--globe-chart-legend-muted') || '#5c6b7a',
		};
	}
}
