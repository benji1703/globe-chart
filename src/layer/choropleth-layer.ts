import type { GlobeInstance } from 'globe.gl';

import { scaleColor } from '../color-scale.js';
import type { GlobeChartConfig } from '../config.js';
import { featureName, isoOf } from '../iso.js';
import { landCapMaterial, solidColorImage } from '../materials.js';
import type { GeoFeature, ThemeColors, ValueIndexResult } from '../types.js';
import { escapeHtml, formatValue } from '../ui/format.js';

export interface ChoroplethPaintOptions {
	globe: GlobeInstance;
	features: GeoFeature[];
	index: ValueIndexResult;
	colors: ThemeColors;
	config: GlobeChartConfig;
	loading: boolean;
	transitionMs: number;
	nameField?: string;
}

export class ChoroplethLayer {
	paint(options: ChoroplethPaintOptions) {
		const { globe, features, index, colors, config, loading, transitionMs } = options;
		const stroke = config.colors.stroke ?? colors.border ?? config.globe.strokeColor;

		globe.polygonsTransitionDuration(transitionMs);

		if (loading) {
			globe
				.polygonsData(features)
				.globeImageUrl(solidColorImage(colors.ocean))
				.backgroundColor('rgba(0,0,0,0)')
				.atmosphereColor(colors.ocean)
				.atmosphereAltitude(config.globe.atmosphereAltitude)
				.polygonAltitude(config.globe.polygonAltitude)
				.polygonCapCurvatureResolution(config.globe.curvatureDeg)
				.polygonCapMaterial(() => landCapMaterial(colors.empty))
				.polygonSideColor(() => 'rgba(0,0,0,0)')
				.polygonStrokeColor(() => stroke)
				.polygonLabel(() => '');
			return;
		}

		const { valueMap, maxValue, rowByIso } = index;
		const tooltipFn = config.labels.tooltip;
		const emptyLabel = config.legend.emptyLabel;
		const format = config.legend.formatValue ?? ((v: number) => formatValue(v, emptyLabel));

		// Prefer CapMaterial (polygonOffset / depthWrite). CapColor alone is enough for
		// picking/labels; avoid a second per-feature color pass when materials are set.
		globe
			.polygonsData(features)
			.globeImageUrl(solidColorImage(colors.ocean))
			.backgroundColor('rgba(0,0,0,0)')
			.atmosphereColor(colors.ocean)
			.atmosphereAltitude(config.globe.atmosphereAltitude)
			.polygonAltitude(config.globe.polygonAltitude)
			.polygonCapCurvatureResolution(config.globe.curvatureDeg)
			.polygonCapMaterial((feat) => {
				const iso = isoOf(feat as GeoFeature);
				const value = valueMap[iso] ?? 0;
				return landCapMaterial(scaleColor(value, maxValue, colors));
			})
			.polygonSideColor(() => 'rgba(0,0,0,0)')
			.polygonStrokeColor(() => stroke)
			.polygonLabel((feat) => {
				const feature = feat as GeoFeature;
				const iso = isoOf(feature);
				const value = valueMap[iso] ?? 0;
				const color = scaleColor(value, maxValue, colors);
				const name = featureName(feature, iso);
				const row = rowByIso[iso];

				if (tooltipFn) {
					return tooltipFn({ iso, name, value, color, row });
				}

				return [
					`<div class="globe-tip">`,
					`<span class="globe-tip__swatch" style="background:${color}"></span>`,
					`<span class="globe-tip__name">${escapeHtml(name)}</span>`,
					`<span class="globe-tip__value">${escapeHtml(format(value, row))}</span>`,
					`</div>`,
				].join('');
			});
	}
}
