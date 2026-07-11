import type { GlobeInstance } from 'globe.gl';

import { scaleColor } from '../core/color-scale.js';
import type { GlobeChartConfig } from '../core/config.js';
import { featureName, isoOf } from '../core/iso.js';
import { landCapMaterial, solidColorImage } from './materials.js';
import type { GeoFeature, ThemeColors, ValueIndexResult } from '../core/types.js';
import { definedProps, isGeoFeature } from '../core/types.js';
import { escapeHtml, formatValue } from '../core/format.js';

export interface ChoroplethPaintOptions {
	globe: GlobeInstance;
	features: readonly GeoFeature[];
	index: ValueIndexResult;
	colors: ThemeColors;
	config: GlobeChartConfig;
	loading: boolean;
	transitionMs: number;
	nameField?: string;
}

function featureFromPolygon(poly: object): GeoFeature | null {
	return isGeoFeature(poly) ? poly : null;
}

export function buildFeatureLabel(
	feat: object,
	index: ValueIndexResult,
	colors: ThemeColors,
	config: GlobeChartConfig,
): string {
	const feature = featureFromPolygon(feat);
	if (!feature) return '';
	const { valueMap, maxValue, rowByIso } = index;
	const iso = isoOf(feature);
	const value = valueMap[iso] ?? 0;
	const color = scaleColor(value, maxValue, colors);
	const name = featureName(feature, iso);
	const row = rowByIso[iso];
	const tooltipFn = config.labels.tooltip;
	const emptyLabel = config.legend.emptyLabel;
	const format = config.legend.formatValue ?? ((v: number) => formatValue(v, emptyLabel));

	if (tooltipFn) {
		return tooltipFn({ iso, name, value, color, ...definedProps({ row }) });
	}

	return [
		`<div class="globe-tip">`,
		`<span class="globe-tip__swatch" style="background:${color}"></span>`,
		`<span class="globe-tip__name">${escapeHtml(name)}</span>`,
		`<span class="globe-tip__value">${escapeHtml(format(value, row))}</span>`,
		`</div>`,
	].join('');
}

export class ChoroplethLayer {
	private _pinnedLabel: string | null = null;

	pinLabel(label: string | null) {
		this._pinnedLabel = label;
	}

	paint(options: ChoroplethPaintOptions) {
		const { globe, features, index, colors, config, loading, transitionMs } = options;
		const stroke = config.colors.stroke ?? colors.border ?? config.globe.strokeColor;

		globe.polygonsTransitionDuration(transitionMs);

		if (loading) {
			globe
				.polygonsData(features as GeoFeature[])
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

		const { valueMap, maxValue } = index;

		// Prefer CapMaterial (polygonOffset / depthWrite). CapColor alone is enough for
		// picking/labels; avoid a second per-feature color pass when materials are set.
		globe
			.polygonsData(features as GeoFeature[])
			.globeImageUrl(solidColorImage(colors.ocean))
			.backgroundColor('rgba(0,0,0,0)')
			.atmosphereColor(colors.ocean)
			.atmosphereAltitude(config.globe.atmosphereAltitude)
			.polygonAltitude(config.globe.polygonAltitude)
			.polygonCapCurvatureResolution(config.globe.curvatureDeg)
			.polygonCapMaterial((feat) => {
				const feature = featureFromPolygon(feat);
				const iso = feature ? isoOf(feature) : '';
				const value = valueMap[iso] ?? 0;
				return landCapMaterial(scaleColor(value, maxValue, colors));
			})
			.polygonSideColor(() => 'rgba(0,0,0,0)')
			.polygonStrokeColor(() => stroke)
			.polygonLabel((feat) => {
				if (this._pinnedLabel !== null) return this._pinnedLabel;
				return buildFeatureLabel(feat, index, colors, config);
			});
	}
}
