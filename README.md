# globe-chart

Framework-agnostic `<globe-chart>` web component ([Lit](https://lit.dev)) for
plotting **per-country values** on a 3D globe, built on
[globe.gl](https://globe.gl).

Pass ISO country codes and numeric values to render a choropleth with an optional
legend, themes, camera controls, and in-component toast feedback.

Country outlines come from [Natural Earth](https://www.naturalearthdata.com/)
110m admin-0 data (public domain), shipped as quantized TopoJSON. See `NOTICE`.

## Demo

[![globe-chart dark theme demo with country choropleth and hover tooltip](https://raw.githubusercontent.com/benji1703/globe-chart/main/docs/images/demo-dark.png)](https://benji1703.github.io/globe-chart/)

## License

**Dual model**

- **Open source projects** (OSI-approved license): free under the MIT License
  (`LICENSE`).
- **Proprietary / closed-source / commercial products:** require written approval
  — see `COMMERCIAL.md` and email benjiar@gmail.com.

## Install

```bash
npm install globe-chart
```

`lit`, `globe.gl`, and `three` are installed as dependencies of this package.

### Shrink your bundle (recommended)

`globe-chart` only uses globe.gl's polygons layer, but `three-globe` (a globe.gl
dependency) statically imports the three.js **WebGPU renderer**, **TSL shader
language**, and **h3-js** for layers this component never touches (heatmaps,
hexbins). Aliasing them to the stubs shipped with this package cuts the
globe.gl chunk roughly in half (~460 kB → ~220 kB gzipped):

```ts
// vite.config.ts
export default defineConfig({
	resolve: {
		alias: {
			'three/webgpu': 'globe-chart/stubs/three-webgpu.js',
			'three/tsl': 'globe-chart/stubs/three-tsl.js',
			'h3-js': 'globe-chart/stubs/h3-js.js',
		},
	},
});
```

Webpack equivalent: `resolve.alias` with the same mappings. Skip this if other
parts of your app use those globe.gl layers or import `three/webgpu` directly.

## Usage

```html
<script type="module">
	import 'globe-chart';
</script>

<globe-chart id="globe" style="width: 600px; height: 600px" legend></globe-chart>
<script type="module">
	const el = document.getElementById('globe');
	el.data = [
		{ iso: 'US', value: 1200 },
		{ iso: 'FR', value: 280 },
	];
	el.config = {
		legend: { title: 'Revenue by country' },
		colors: { low: '#f5c518', high: '#c41e1e' },
	};
</script>
```

```ts
import { GlobeChart, globeChartMockData } from 'globe-chart';

const el = document.createElement('globe-chart');
el.data = globeChartMockData;
el.showLegend = true;
el.config = { legend: { title: 'Sample values' } };
document.body.append(el);
```

### Properties

| Property            | Attribute            | Default   | Description                                      |
| ------------------- | -------------------- | --------- | ------------------------------------------------ |
| `data`              | —                    | `[]`      | Rows to plot                                     |
| `isoField`          | `iso-field`          | `'iso'`   | ISO country code field                           |
| `valueField`        | `value-field`        | `'value'` | Numeric value field                              |
| `nameField`         | `name-field`         | `'name'`  | Optional display name field on rows              |
| `loading`           | `loading`            | `false`   | Empty rolling globe                              |
| `showLegend`        | `legend`             | `false`   | Overlay legend                                   |
| `legendPosition`    | `legend-position`    | `'left'`  | `'left'` \| `'right'`                            |
| `theme`             | `theme`              | `'auto'`  | `'light'` \| `'dark'` \| `'auto'` (OS)           |
| `animated`          | `animated`           | `true`    | Polygon + camera transitions                     |
| `animateNavigation` | `animate-navigation` | `true`    | Animate camera on jump / auto-center             |
| `autoCenter`        | `auto-center`        | `true`    | Fly to highest value on first reveal             |
| `autoRotate`        | `auto-rotate`        | `false`   | Keep spinning when loaded                        |
| `autoRotateSpeed`   | `auto-rotate-speed`  | `0.35`    | Orbit rotate speed                               |
| `config`            | —                    | `{}`      | Nested options (legend, colors, camera, toasts…) |
| `legendResults`     | —                    | `null`    | Host-supplied remote search hits for the legend  |

### `config` (high level)

```ts
el.config = {
	legend: {
		title, subtitle, showScale, showCount, formatValue, emptyLabel,
		pageSize: 25, // 0 = no paging
		maxHeight: '280px',
		collapsible: true,
		collapseMode: 'mobile', // 'never' | 'always' | 'mobile'
		collapseOnSelect: 'mobile', // 'never' | 'mobile' | 'always'
		mobileBreakpoint: '(max-width: 768px)',
		toggleLabel: 'Legend',
		search: {
			enabled: true,
			mode: 'local' | 'remote' | 'hybrid',
			placeholder: 'Search countries…',
			debounceMs: 250,
			minLength: 1,
			provider: async (query, signal) => {
				const res = await fetch(`/api/countries?q=${encodeURIComponent(query)}`, { signal });
				return res.json(); // [{ iso, name?, value? }]
			},
		},
	},
	colors: { ocean, empty, low, high, stroke },
	labels: { tooltip: ({ iso, name, value, color, row }) => htmlString },
	camera: { initial, jumpAltitude, durations },
	globe: { atmosphereAltitude, strokeColor, curvatureDeg },
	toasts: { enabled, position, maxVisible, persistWarnings },
};
```

With `collapseMode: 'mobile'` (default), small screens show a **Legend** button;
desktop keeps the panel open. After a country select, the panel collapses only on
mobile (`collapseOnSelect: 'mobile'`). Use `'always'` to collapse on every
viewport, or `'never'` to keep it open.

For event-driven backends (no `provider`), listen for `legend-search` and set
`el.legendResults = [{ iso, name, value? }, …]` (or `null` to clear).

### Events

| Event            | Detail                                      |
| ---------------- | ------------------------------------------- |
| `ready`          | —                                           |
| `country-select` | `{ iso, name, value, color… }`              |
| `legend-search`  | `{ query, signal }` (remote/hybrid search)  |
| `error`          | `{ title, body, details… }`                 |
| `warning`        | `{ title, body, details… }`                 |

### Theming

`theme="light" | "dark" | "auto"` (default `auto` follows the OS). Defaults use a
clear blue sea and a yellow→red scale; override with CSS vars or `config.colors`.

CSS custom properties on the host:

- `--globe-chart-ocean-color` / `--globe-chart-empty-color`
- `--globe-chart-low-color` / `--globe-chart-high-color`
- `--globe-chart-risk-low-color` / `--globe-chart-risk-high-color` / `--globe-chart-land-color` (aliases)
- `--globe-chart-border-color`
- `--globe-chart-legend-bg` / `--globe-chart-legend-fg` / `--globe-chart-legend-muted`
- `--globe-chart-legend-max-height` (or `config.legend.maxHeight`)
- `--globe-chart-font`

### Feedback

Problems surface as in-component toasts (skipped rows, init failures, empty data)
and matching `error` / `warning` DOM events. Disable UI with
`config.toasts.enabled = false` if the host app handles events only.

## Framework demos

Live integrations showing `globe-chart` in every major framework, each with a 2026-era ITDR/ISPM security dashboard:

| Framework | Demo | Source |
| --------- | ---- | ------ |
| React | [globe-chart-demo-react](https://benji1703.github.io/globe-chart-demo-react/) | [benji1703/globe-chart-demo-react](https://github.com/benji1703/globe-chart-demo-react) |
| Vue 3 | [globe-chart-demo-vue](https://benji1703.github.io/globe-chart-demo-vue/) | [benji1703/globe-chart-demo-vue](https://github.com/benji1703/globe-chart-demo-vue) |
| Svelte | [globe-chart-demo-svelte](https://benji1703.github.io/globe-chart-demo-svelte/) | [benji1703/globe-chart-demo-svelte](https://github.com/benji1703/globe-chart-demo-svelte) |
| Angular | [globe-chart-demo-angular](https://benji1703.github.io/globe-chart-demo-angular/) | [benji1703/globe-chart-demo-angular](https://github.com/benji1703/globe-chart-demo-angular) |

## Attribution

Natural Earth public-domain country boundaries — see `NOTICE`.
