import type { LegendCollapseMode } from '../src/config.js';
import { globeChartMockData } from '../src/globe-chart.mock-data.js';
import type { DataRow } from '../src/types.js';
import { datasetGet, datasetSet, isDemoTheme, isLegendSide, isOneOf } from '../src/util.js';
import type { GlobeChart } from '../src/globe-chart.js';
import { version as pkgVersion } from '../package.json';

declare global {
	interface Window {
		/** Set by the blocking theme script in demo/index.html before first paint. */
		__globeChartDemoTheme?: 'light' | 'dark';
	}
}

const releaseLabel = `v${pkgVersion}`;
const versionBadge = document.getElementById('pkg-version');
if (versionBadge) {
	versionBadge.textContent = releaseLabel;
	versionBadge.setAttribute('title', `globe-chart ${releaseLabel} on npm`);
}
const versionFoot = document.getElementById('pkg-version-foot');
if (versionFoot) {
	versionFoot.textContent = releaseLabel;
}

// Warm the heavy WebGL chunk while the hero is on screen.
void import('globe.gl');

const riskData = globeChartMockData;

const salesData: DataRow[] = [
	{ iso: 'US', value: 4200, name: 'United States' },
	{ iso: 'DE', value: 1800 },
	{ iso: 'FR', value: 1500 },
	{ iso: 'GB', value: 1320 },
	{ iso: 'JP', value: 2100 },
	{ iso: 'BR', value: 980 },
	{ iso: '', value: 12 },
	{ iso: 'XX', value: 'n/a' },
];

const COLLAPSE_MODES = ['never', 'always', 'mobile'] as const satisfies readonly LegendCollapseMode[];

const stage = document.getElementById('demo');

function requireEl<T extends HTMLElement>(id: string, isType: (el: Element) => el is T): T {
	const el = document.getElementById(id);
	if (!el || !isType(el)) {
		throw new Error(`Demo expected #${id}`);
	}
	return el;
}

const isHTMLSelect = (el: Element): el is HTMLSelectElement => el instanceof HTMLSelectElement;
const isHTMLInput = (el: Element): el is HTMLInputElement => el instanceof HTMLInputElement;
const isHTMLElement = (el: Element): el is HTMLElement => el instanceof HTMLElement;
const isGlobeChart = (el: Element): el is GlobeChart => el.localName === 'globe-chart';

async function bootDemo() {
	await import('../src/globe-chart.js');
	const globe = requireEl('globe', isGlobeChart);

	const dataset = requireEl('dataset', isHTMLSelect);
	const autoRotate = requireEl('autoRotate', isHTMLInput);
	const loading = requireEl('loading', isHTMLInput);
	const showLegend = requireEl('showLegend', isHTMLInput);
	const legendCollapsible = requireEl('legendCollapsible', isHTMLInput);
	const collapseMode = requireEl('collapseMode', isHTMLSelect);
	const collapseOnSelect = requireEl('collapseOnSelect', isHTMLSelect);
	const legendSide = requireEl('legendSide', isHTMLSelect);
	const legendTitle = requireEl('legendTitle', isHTMLInput);
	const legendSearch = requireEl('legendSearch', isHTMLInput);
	const legendHeight = requireEl('legendHeight', isHTMLSelect);
	const pageSize = requireEl('pageSize', isHTMLSelect);
	const snippet = requireEl('snippet', isHTMLElement);
	const themeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-set]')];

	function applyTheme(theme: 'light' | 'dark') {
		document.documentElement.dataset['theme'] = theme;
		document.documentElement.style.colorScheme = theme;
		localStorage.setItem('globe-chart-demo-theme', theme);
		window.__globeChartDemoTheme = theme;
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', theme === 'dark' ? '#060e18' : '#f4f8fc');
		globe.theme = theme;
		for (const btn of themeButtons) {
			const active = datasetGet(btn, 'themeSet') === theme;
			btn.setAttribute('aria-pressed', active ? 'true' : 'false');
		}
	}

	function syncConfig() {
		const isSales = dataset.value === 'sales';
		const mode = isOneOf(collapseMode.value, COLLAPSE_MODES) ? collapseMode.value : 'mobile';
		const onSelect = isOneOf(collapseOnSelect.value, COLLAPSE_MODES)
			? collapseOnSelect.value
			: 'mobile';
		globe.config = {
			legend: {
				title: legendTitle.value || (isSales ? 'Sales by country' : 'By country'),
				showScale: true,
				showCount: true,
				pageSize: Number(pageSize.value) || 0,
				maxHeight: legendHeight.value,
				collapsible: legendCollapsible.checked,
				collapseMode: mode,
				collapseOnSelect: onSelect,
				toggleLabel: 'Legend',
				search: {
					enabled: legendSearch.checked,
					mode: 'local',
					placeholder: 'Filter countries…',
				},
			},
			colors: isSales
				? { low: '#7dd3fc', high: '#0369a1' }
				: {},
			toasts: { enabled: true, position: 'bottom-end' },
		};
	}

	function syncData() {
		if (dataset.value === 'empty') {
			globe.data = [];
		} else if (dataset.value === 'sales') {
			globe.data = salesData;
			if (!datasetGet(legendTitle, 'touched')) legendTitle.value = 'Sales by country';
		} else {
			globe.data = riskData;
			if (!datasetGet(legendTitle, 'touched')) legendTitle.value = 'Risk by country';
		}
		syncConfig();
		updateSnippet();
	}

	function updateSnippet() {
		const theme = isDemoTheme(document.documentElement.dataset['theme'])
			? document.documentElement.dataset['theme']
			: 'light';
		const legendAttr = showLegend.checked ? ' legend' : '';
		snippet.textContent = `<globe-chart${legendAttr} theme="${theme}" style="width:100%;height:600px"></globe-chart>
<script type="module">
  import 'globe-chart';
  const el = document.querySelector('globe-chart');
  el.data = ${JSON.stringify(globe.data.slice(0, 3), null, 2)};
  el.config = {
    legend: {
      title: '${legendTitle.value.replace(/'/g, "\\'")}',
      maxHeight: '${legendHeight.value}',
      collapsible: ${legendCollapsible.checked},
      collapseMode: '${collapseMode.value}',
      collapseOnSelect: '${collapseOnSelect.value}',
    },
  };
<\/script>`;
	}

	const storedTheme = localStorage.getItem('globe-chart-demo-theme');
	const saved: 'light' | 'dark' = isDemoTheme(window.__globeChartDemoTheme)
		? window.__globeChartDemoTheme
		: isDemoTheme(document.documentElement.dataset['theme'])
			? document.documentElement.dataset['theme']
			: isDemoTheme(storedTheme)
				? storedTheme
				: window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
	applyTheme(saved);

	globe.showLegend = showLegend.checked;
	syncData();

	dataset.addEventListener('change', syncData);
	autoRotate.addEventListener('change', () => {
		globe.autoRotate = autoRotate.checked;
	});
	loading.addEventListener('change', () => {
		globe.loading = loading.checked;
	});
	showLegend.addEventListener('change', () => {
		globe.showLegend = showLegend.checked;
		updateSnippet();
	});
	legendCollapsible.addEventListener('change', () => {
		syncConfig();
		updateSnippet();
	});
	collapseMode.addEventListener('change', () => {
		syncConfig();
		updateSnippet();
	});
	collapseOnSelect.addEventListener('change', () => {
		syncConfig();
		updateSnippet();
	});
	legendSide.addEventListener('change', () => {
		if (isLegendSide(legendSide.value)) globe.legendPosition = legendSide.value;
	});
	legendTitle.addEventListener('input', () => {
		datasetSet(legendTitle, 'touched', '1');
		syncConfig();
		updateSnippet();
	});
	legendSearch.addEventListener('change', syncConfig);
	legendHeight.addEventListener('change', () => {
		syncConfig();
		updateSnippet();
	});
	pageSize.addEventListener('change', syncConfig);

	for (const btn of themeButtons) {
		btn.addEventListener('click', () => {
			const next = datasetGet(btn, 'themeSet');
			if (!isDemoTheme(next)) return;
			applyTheme(next);
			updateSnippet();
		});
	}
}

function whenNearDemo(cb: () => void) {
	if (!stage || typeof IntersectionObserver !== 'function') {
		cb();
		return;
	}
	const io = new IntersectionObserver(
		(entries) => {
			if (!entries.some((e) => e.isIntersecting)) return;
			io.disconnect();
			cb();
		},
		{ rootMargin: '200px' },
	);
	io.observe(stage);
}

whenNearDemo(() => {
	void bootDemo();
});
