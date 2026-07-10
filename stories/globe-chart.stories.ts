import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

import type {
	GlobeChartConfigInput,
	LegendCollapseMode,
	LegendCollapseOnSelect,
	LegendSearchMode,
	ToastPosition,
} from '../src/config';
import { globeChartMockData } from '../src/globe-chart.mock-data';

/** Flat Storybook controls — assembled into `config` + element props at render time. */
export type PlaygroundArgs = {
	data: Record<string, unknown>[];
	isoField: string;
	valueField: string;
	nameField: string;
	loading: boolean;
	showLegend: boolean;
	legendPosition: 'left' | 'right';
	/** Prefer toolbar theme, or force a value on the element. */
	themeSource: 'toolbar' | 'light' | 'dark' | 'auto';
	animated: boolean;
	animateNavigation: boolean;
	autoCenter: boolean;
	autoRotate: boolean;
	autoRotateSpeed: number;
	// Legend
	legendTitle: string;
	legendSubtitle: string;
	showScale: boolean;
	showCount: boolean;
	emptyLabel: string;
	pageSize: number;
	maxHeight: string;
	collapsible: boolean;
	collapseMode: LegendCollapseMode;
	collapseOnSelect: LegendCollapseOnSelect;
	mobileBreakpoint: string;
	toggleLabel: string;
	searchEnabled: boolean;
	searchMode: LegendSearchMode;
	searchPlaceholder: string;
	searchDebounceMs: number;
	searchMinLength: number;
	useRemoteProvider: boolean;
	// Colors (empty string = theme default)
	colorOcean: string;
	colorEmpty: string;
	colorLow: string;
	colorHigh: string;
	colorStroke: string;
	// Camera
	cameraLat: number;
	cameraLng: number;
	cameraAltitude: number;
	jumpAltitude: number;
	durationNavigate: number;
	durationReveal: number;
	durationPolygon: number;
	// Globe
	atmosphereAltitude: number;
	globeStrokeColor: string;
	curvatureDeg: number;
	polygonAltitude: number;
	loadingRotateSpeed: number;
	autoRotateDirection: number;
	// Toasts
	toastsEnabled: boolean;
	toastPosition: ToastPosition;
	maxVisible: number;
	persistWarnings: boolean;
	warningDismissMs: number;
};

function optionalColor(value: string): string | undefined {
	const v = value?.trim();
	return v ? v : undefined;
}

function buildConfig(args: PlaygroundArgs): GlobeChartConfigInput {
	const search = {
		enabled: args.searchEnabled,
		mode: args.searchMode,
		placeholder: args.searchPlaceholder,
		debounceMs: args.searchDebounceMs,
		minLength: args.searchMinLength,
		...(args.useRemoteProvider && (args.searchMode === 'remote' || args.searchMode === 'hybrid')
			? {
					provider: async (query: string) => {
						const q = query.toLowerCase();
						await new Promise((r) => setTimeout(r, 120));
						return args.data
							.filter((row) => {
								const iso = String(row[args.isoField] ?? '').toLowerCase();
								const name = String(row[args.nameField] ?? '').toLowerCase();
								return iso.includes(q) || name.includes(q);
							})
							.map((row) => ({
								iso: String(row[args.isoField]),
								name: row[args.nameField] != null ? String(row[args.nameField]) : undefined,
								value: Number(row[args.valueField]),
							}));
					},
				}
			: {}),
	};

	return {
		legend: {
			title: args.legendTitle,
			subtitle: args.legendSubtitle,
			showScale: args.showScale,
			showCount: args.showCount,
			emptyLabel: args.emptyLabel,
			pageSize: args.pageSize,
			maxHeight: args.maxHeight,
			collapsible: args.collapsible,
			collapseMode: args.collapseMode,
			collapseOnSelect: args.collapseOnSelect,
			mobileBreakpoint: args.mobileBreakpoint,
			toggleLabel: args.toggleLabel,
			search,
		},
		colors: {
			ocean: optionalColor(args.colorOcean),
			empty: optionalColor(args.colorEmpty),
			low: optionalColor(args.colorLow),
			high: optionalColor(args.colorHigh),
			stroke: optionalColor(args.colorStroke),
		},
		camera: {
			initial: {
				lat: args.cameraLat,
				lng: args.cameraLng,
				altitude: args.cameraAltitude,
			},
			jumpAltitude: args.jumpAltitude,
			durations: {
				navigate: args.durationNavigate,
				reveal: args.durationReveal,
				polygon: args.durationPolygon,
			},
		},
		globe: {
			atmosphereAltitude: args.atmosphereAltitude,
			strokeColor: args.globeStrokeColor,
			curvatureDeg: args.curvatureDeg,
			polygonAltitude: args.polygonAltitude,
			loadingRotateSpeed: args.loadingRotateSpeed,
			autoRotateDirection: args.autoRotateDirection,
		},
		toasts: {
			enabled: args.toastsEnabled,
			position: args.toastPosition,
			maxVisible: args.maxVisible,
			persistWarnings: args.persistWarnings,
			warningDismissMs: args.warningDismissMs,
		},
	};
}

const playgroundDefaults: PlaygroundArgs = {
	data: globeChartMockData,
	isoField: 'iso',
	valueField: 'value',
	nameField: 'name',
	loading: false,
	showLegend: true,
	legendPosition: 'left',
	themeSource: 'toolbar',
	animated: true,
	animateNavigation: true,
	autoCenter: true,
	autoRotate: false,
	autoRotateSpeed: 0.35,
	legendTitle: 'Risk by country',
	legendSubtitle: 'Sample dataset',
	showScale: true,
	showCount: true,
	emptyLabel: 'No data',
	pageSize: 8,
	maxHeight: 'min(360px, calc(100% - 24px))',
	collapsible: true,
	collapseMode: 'mobile',
	collapseOnSelect: 'mobile',
	mobileBreakpoint: '(max-width: 768px)',
	toggleLabel: 'Legend',
	searchEnabled: true,
	searchMode: 'local',
	searchPlaceholder: 'Filter countries…',
	searchDebounceMs: 250,
	searchMinLength: 1,
	useRemoteProvider: false,
	colorOcean: '',
	colorEmpty: '',
	colorLow: '',
	colorHigh: '',
	colorStroke: '',
	cameraLat: 20,
	cameraLng: -30,
	cameraAltitude: 1.5,
	jumpAltitude: 1.15,
	durationNavigate: 1200,
	durationReveal: 1800,
	durationPolygon: 900,
	atmosphereAltitude: 0.12,
	globeStrokeColor: 'rgba(30, 55, 85, 0.4)',
	curvatureDeg: 1,
	polygonAltitude: 0,
	loadingRotateSpeed: 1.5,
	autoRotateDirection: -1,
	toastsEnabled: true,
	toastPosition: 'bottom-end',
	maxVisible: 3,
	persistWarnings: false,
	warningDismissMs: 8000,
};

const meta: Meta<PlaygroundArgs> = {
	title: 'GlobeChart',
	parameters: {
		docs: {
			description: {
				component:
					'Full interactive playground. Use Controls for every public prop and config option. Toolbar Theme sets light/dark unless Theme source is forced.',
			},
		},
		controls: { sort: 'none' },
	},
	render: (args, { globals }) => {
		const theme =
			args.themeSource === 'toolbar'
				? globals.theme === 'dark'
					? 'dark'
					: 'light'
				: args.themeSource;
		const config = buildConfig(args);

		return html`
			<div style="height:min(80vh,720px);width:100%;min-height:480px">
				<globe-chart
					.data=${args.data}
					.isoField=${args.isoField}
					.valueField=${args.valueField}
					.nameField=${args.nameField}
					.loading=${args.loading}
					.showLegend=${args.showLegend}
					.legendPosition=${args.legendPosition}
					.theme=${theme}
					.animated=${args.animated}
					.autoRotate=${args.autoRotate}
					.autoRotateSpeed=${args.autoRotateSpeed}
					.autoCenter=${args.autoCenter}
					.animateNavigation=${args.animateNavigation}
					.config=${config}
				></globe-chart>
			</div>
		`;
	},
	argTypes: {
		data: {
			name: 'data',
			control: 'object',
			description: 'Rows `{ iso, value, name? }`',
			table: { category: 'Data', order: 1 },
		},
		isoField: { control: 'text', table: { category: 'Data' } },
		valueField: { control: 'text', table: { category: 'Data' } },
		nameField: { control: 'text', table: { category: 'Data' } },
		loading: {
			control: 'boolean',
			description: 'Empty rolling globe',
			table: { category: 'State' },
		},
		showLegend: { name: 'legend', control: 'boolean', table: { category: 'State' } },
		legendPosition: {
			control: 'radio',
			options: ['left', 'right'],
			table: { category: 'State' },
		},
		themeSource: {
			name: 'theme source',
			control: 'radio',
			options: ['toolbar', 'light', 'dark', 'auto'],
			description: '`toolbar` follows the Storybook theme switcher',
			table: { category: 'Theme' },
		},
		animated: { name: 'animated', control: 'boolean', table: { category: 'Motion' } },
		animateNavigation: {
			name: 'animate navigation',
			control: 'boolean',
			table: { category: 'Motion' },
		},
		autoCenter: { control: 'boolean', table: { category: 'Motion' } },
		autoRotate: { name: 'auto rotate', control: 'boolean', table: { category: 'Motion' } },
		autoRotateSpeed: {
			name: 'auto rotate speed',
			control: { type: 'number', min: 0, max: 2, step: 0.05 },
			table: { category: 'Motion' },
		},
		legendTitle: { name: 'title', control: 'text', table: { category: 'Legend' } },
		legendSubtitle: { name: 'subtitle', control: 'text', table: { category: 'Legend' } },
		showScale: { name: 'show scale', control: 'boolean', table: { category: 'Legend' } },
		showCount: { name: 'show count', control: 'boolean', table: { category: 'Legend' } },
		emptyLabel: { name: 'empty label', control: 'text', table: { category: 'Legend' } },
		pageSize: {
			name: 'page size',
			control: { type: 'number', min: 0, max: 50, step: 1 },
			description: '`0` = no paging',
			table: { category: 'Legend' },
		},
		maxHeight: { name: 'max height', control: 'text', table: { category: 'Legend' } },
		collapsible: { control: 'boolean', table: { category: 'Legend' } },
		collapseMode: {
			name: 'collapse mode',
			control: 'radio',
			options: ['mobile', 'always', 'never'],
			table: { category: 'Legend' },
		},
		collapseOnSelect: {
			name: 'collapse on select',
			control: 'radio',
			options: ['mobile', 'never', 'always'],
			description: 'Desktop stays open with `mobile` (default)',
			table: { category: 'Legend' },
		},
		mobileBreakpoint: {
			name: 'mobile breakpoint',
			control: 'text',
			table: { category: 'Legend' },
		},
		toggleLabel: { name: 'toggle label', control: 'text', table: { category: 'Legend' } },
		searchEnabled: { name: 'search enabled', control: 'boolean', table: { category: 'Legend search' } },
		searchMode: {
			name: 'search mode',
			control: 'radio',
			options: ['local', 'remote', 'hybrid'],
			table: { category: 'Legend search' },
		},
		searchPlaceholder: {
			name: 'placeholder',
			control: 'text',
			table: { category: 'Legend search' },
		},
		searchDebounceMs: {
			name: 'debounce ms',
			control: { type: 'number', min: 0, max: 2000, step: 50 },
			table: { category: 'Legend search' },
		},
		searchMinLength: {
			name: 'min length',
			control: { type: 'number', min: 0, max: 5, step: 1 },
			table: { category: 'Legend search' },
		},
		useRemoteProvider: {
			name: 'demo remote provider',
			control: 'boolean',
			description: 'Injects a mock `provider` when mode is remote/hybrid',
			table: { category: 'Legend search' },
		},
		colorOcean: {
			name: 'ocean',
			control: 'text',
			description: 'Leave empty for theme default',
			table: { category: 'Colors' },
		},
		colorEmpty: { name: 'empty land', control: 'text', table: { category: 'Colors' } },
		colorLow: { name: 'low', control: 'text', description: 'e.g. #f5c518 — empty = theme', table: { category: 'Colors' } },
		colorHigh: { name: 'high', control: 'text', description: 'e.g. #c41e1e — empty = theme', table: { category: 'Colors' } },
		colorStroke: { name: 'stroke', control: 'text', table: { category: 'Colors' } },
		cameraLat: {
			name: 'initial lat',
			control: { type: 'number', min: -90, max: 90, step: 1 },
			table: { category: 'Camera' },
		},
		cameraLng: {
			name: 'initial lng',
			control: { type: 'number', min: -180, max: 180, step: 1 },
			table: { category: 'Camera' },
		},
		cameraAltitude: {
			name: 'initial altitude',
			control: { type: 'number', min: 0.5, max: 4, step: 0.05 },
			table: { category: 'Camera' },
		},
		jumpAltitude: {
			name: 'jump altitude',
			control: { type: 'number', min: 0.5, max: 3, step: 0.05 },
			table: { category: 'Camera' },
		},
		durationNavigate: {
			name: 'navigate ms',
			control: { type: 'number', min: 0, max: 5000, step: 100 },
			table: { category: 'Camera' },
		},
		durationReveal: {
			name: 'reveal ms',
			control: { type: 'number', min: 0, max: 5000, step: 100 },
			table: { category: 'Camera' },
		},
		durationPolygon: {
			name: 'polygon ms',
			control: { type: 'number', min: 0, max: 3000, step: 50 },
			table: { category: 'Camera' },
		},
		atmosphereAltitude: {
			name: 'atmosphere altitude',
			control: { type: 'number', min: 0, max: 0.5, step: 0.01 },
			table: { category: 'Globe' },
		},
		globeStrokeColor: { name: 'stroke color', control: 'text', table: { category: 'Globe' } },
		curvatureDeg: {
			name: 'cap curvature °',
			control: { type: 'number', min: 0, max: 5, step: 0.25 },
			table: { category: 'Globe' },
		},
		polygonAltitude: {
			name: 'polygon altitude',
			control: { type: 'number', min: 0, max: 0.2, step: 0.005 },
			table: { category: 'Globe' },
		},
		loadingRotateSpeed: {
			name: 'loading rotate speed',
			control: { type: 'number', min: 0, max: 5, step: 0.1 },
			table: { category: 'Globe' },
		},
		autoRotateDirection: {
			name: 'rotate direction',
			control: { type: 'number', min: -2, max: 2, step: 1 },
			description: 'Typically `-1` or `1`',
			table: { category: 'Globe' },
		},
		toastsEnabled: { name: 'enabled', control: 'boolean', table: { category: 'Toasts' } },
		toastPosition: {
			name: 'position',
			control: 'select',
			options: ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
			table: { category: 'Toasts' },
		},
		maxVisible: {
			name: 'max visible',
			control: { type: 'number', min: 1, max: 8, step: 1 },
			table: { category: 'Toasts' },
		},
		persistWarnings: { name: 'persist warnings', control: 'boolean', table: { category: 'Toasts' } },
		warningDismissMs: {
			name: 'warning dismiss ms',
			control: { type: 'number', min: 0, max: 30000, step: 500 },
			table: { category: 'Toasts' },
		},
	},
	args: playgroundDefaults,
};

export default meta;

type Story = StoryObj<PlaygroundArgs>;

/** Kitchen-sink controls — every public prop and config option. */
export const Playground: Story = {
	args: { ...playgroundDefaults },
};

export const Default: Story = {
	args: {
		showLegend: false,
		searchEnabled: false,
		legendSubtitle: '',
		pageSize: 0,
	},
};

export const Light: Story = {
	globals: { theme: 'light' },
	args: { themeSource: 'light', showLegend: true },
};

export const Dark: Story = {
	globals: { theme: 'dark' },
	args: { themeSource: 'dark', showLegend: true },
};

export const Loading: Story = {
	args: {
		loading: true,
		autoRotate: true,
		showLegend: false,
	},
};

export const Empty: Story = {
	args: {
		data: [],
		showLegend: true,
		legendTitle: 'By country',
	},
};

export const WithLegend: Story = {
	args: {
		showLegend: true,
		legendPosition: 'left',
		searchEnabled: false,
		pageSize: 0,
	},
};

export const WithLegendRight: Story = {
	args: {
		showLegend: true,
		legendPosition: 'right',
		searchEnabled: false,
		pageSize: 0,
	},
};

export const LegendSearchAndPaging: Story = {
	args: {
		showLegend: true,
		legendTitle: 'By country',
		pageSize: 8,
		maxHeight: '280px',
		searchEnabled: true,
		searchMode: 'local',
		searchPlaceholder: 'Filter countries…',
	},
};

export const LegendRemoteSearch: Story = {
	args: {
		showLegend: true,
		legendTitle: 'Server search',
		pageSize: 10,
		searchEnabled: true,
		searchMode: 'remote',
		searchDebounceMs: 200,
		searchMinLength: 1,
		searchPlaceholder: 'Search via provider…',
		useRemoteProvider: true,
	},
};

export const CollapsibleAlways: Story = {
	args: {
		showLegend: true,
		collapsible: true,
		collapseMode: 'always',
		collapseOnSelect: 'always',
		toggleLabel: 'Legend',
	},
};

export const CustomRiskColors: Story = {
	args: {
		showLegend: true,
		colorLow: '#f5c518',
		colorHigh: '#c41e1e',
		colorOcean: '#c8e0f5',
		legendTitle: 'Custom scale',
	},
};

export const AutoRotate: Story = {
	args: {
		showLegend: true,
		autoRotate: true,
		autoRotateSpeed: 0.45,
	},
};

export const NoAnimation: Story = {
	args: {
		showLegend: true,
		animated: false,
		animateNavigation: false,
	},
};
