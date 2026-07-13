import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';

import type {
	CountryEventDetail,
	FeedbackEventDetail,
	LegendSearchEventDetail,
} from './core/types.js';
import { GlobeChart as GlobeChartElement } from './globe-chart.js';

/**
 * React component wrapping `<globe-chart>`.
 *
 * Complex values (`data`, `config`, `countries`, `legendResults`) are set as
 * element properties; events surface as typed callbacks:
 *
 * ```tsx
 * import { GlobeChart } from 'globe-chart/react';
 *
 * <GlobeChart
 *   data={rows}
 *   legend
 *   onCountrySelect={(e) => console.log(e.detail.iso)}
 * />
 * ```
 */
export const GlobeChart = createComponent({
	tagName: 'globe-chart',
	elementClass: GlobeChartElement,
	react: React,
	events: {
		onReady: 'ready' as EventName<CustomEvent<undefined>>,
		onCountrySelect: 'country-select' as EventName<CustomEvent<CountryEventDetail>>,
		onCountryHover: 'country-hover' as EventName<CustomEvent<CountryEventDetail | null>>,
		onLegendSearch: 'legend-search' as EventName<CustomEvent<LegendSearchEventDetail>>,
		onError: 'globe-error' as EventName<CustomEvent<FeedbackEventDetail>>,
		onWarning: 'globe-warning' as EventName<CustomEvent<FeedbackEventDetail>>,
	},
});

export { GlobeChartElement };
export type { CountryEventDetail, FeedbackEventDetail, LegendSearchEventDetail };
