import type { GlobeChart } from '../src/globe-chart.ts';
import type { LegendCollapseMode, LegendCollapseOnSelect } from '../src/config.ts';
import { globeChartMockData } from '../src/globe-chart.mock-data.ts';

declare global {
	interface Window {
		/** Set by the blocking theme script in demo/index.html before first paint. */
		__globeChartDemoTheme?: 'light' | 'dark';
	}
}

// Warm the heavy WebGL chunk while the hero is on screen.
void import('globe.gl');

const riskData = globeChartMockData;

const salesData: Record<string, unknown>[] = [
	{ iso: 'US', value: 4200, name: 'United States' },
	{ iso: 'DE', value: 1800 },
	{ iso: 'FR', value: 1500 },
	{ iso: 'GB', value: 1320 },
	{ iso: 'JP', value: 2100 },
	{ iso: 'BR', value: 980 },
	{ iso: '', value: 12 },
	{ iso: 'XX', value: 'n/a' },
];

const stage = document.getElementById('demo');
const globeEl = document.getElementById('globe') as GlobeChart | null;

async function bootDemo() {
	await import('../src/globe-chart.ts');
	const globe = (globeEl ?? document.getElementById('globe')) as GlobeChart;
	if (!globe) return;

	const dataset = document.getElementById('dataset') as HTMLSelectElement;
	const autoRotate = document.getElementById('autoRotate') as HTMLInputElement;
	const loading = document.getElementById('loading') as HTMLInputElement;
	const showLegend = document.getElementById('showLegend') as HTMLInputElement;
	const legendCollapsible = document.getElementById('legendCollapsible') as HTMLInputElement;
	const collapseMode = document.getElementById('collapseMode') as HTMLSelectElement;
	const collapseOnSelect = document.getElementById('collapseOnSelect') as HTMLSelectElement;
	const legendSide = document.getElementById('legendSide') as HTMLSelectElement;
	const legendTitle = document.getElementById('legendTitle') as HTMLInputElement;
	const legendSearch = document.getElementById('legendSearch') as HTMLInputElement;
	const legendHeight = document.getElementById('legendHeight') as HTMLSelectElement;
	const pageSize = document.getElementById('pageSize') as HTMLSelectElement;
	const snippet = document.getElementById('snippet') as HTMLElement;
	const themeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-set]')];

	function applyTheme(theme: 'light' | 'dark') {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.colorScheme = theme;
		localStorage.setItem('globe-chart-demo-theme', theme);
		window.__globeChartDemoTheme = theme;
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', theme === 'dark' ? '#060e18' : '#f4f8fc');
		globe.theme = theme;
		for (const btn of themeButtons) {
			const active = btn.dataset.themeSet === theme;
			btn.setAttribute('aria-pressed', active ? 'true' : 'false');
		}
	}

	function syncConfig() {
		const isSales = dataset.value === 'sales';
		globe.config = {
			legend: {
				title: legendTitle.value || (isSales ? 'Sales by country' : 'By country'),
				showScale: true,
				showCount: true,
				pageSize: Number(pageSize.value) || 0,
				maxHeight: legendHeight.value,
				collapsible: legendCollapsible.checked,
				collapseMode: collapseMode.value as LegendCollapseMode,
				collapseOnSelect: collapseOnSelect.value as LegendCollapseOnSelect,
				toggleLabel: 'Legend',
				search: {
					enabled: legendSearch.checked,
					mode: 'local',
					placeholder: 'Filter countries…',
				},
			},
			colors: isSales
				? { low: '#7dd3fc', high: '#0369a1' }
				: { low: undefined, high: undefined },
			toasts: { enabled: true, position: 'bottom-end' },
		};
	}

	function syncData() {
		if (dataset.value === 'empty') {
			globe.data = [];
		} else if (dataset.value === 'sales') {
			globe.data = salesData;
			if (!legendTitle.dataset.touched) legendTitle.value = 'Sales by country';
		} else {
			globe.data = riskData;
			if (!legendTitle.dataset.touched) legendTitle.value = 'Risk by country';
		}
		syncConfig();
		updateSnippet();
	}

	function updateSnippet() {
		const theme = (document.documentElement.dataset.theme as 'light' | 'dark') || 'light';
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

	const saved =
		(window.__globeChartDemoTheme as 'light' | 'dark' | undefined) ??
		(document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ??
		(localStorage.getItem('globe-chart-demo-theme') as 'light' | 'dark' | null) ??
		(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
		globe.legendPosition = legendSide.value as 'left' | 'right';
	});
	legendTitle.addEventListener('input', () => {
		legendTitle.dataset.touched = '1';
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
			const next = btn.dataset.themeSet as 'light' | 'dark';
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
