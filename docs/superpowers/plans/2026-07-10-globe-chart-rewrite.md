# globe-chart Internal Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the 945-line `GlobeChart` god component into Lit Reactive Controllers (one per concern), deduplicate `ui/styles.ts`, and trim the public API surface — with zero visible behavior change.

**Architecture:** Extract pure computation (legend entry building/filtering) into `src/core/`, extract stateful-but-Lit-agnostic concerns (theme, visibility, legend UI state, search, toasts) into `src/controllers/` as `ReactiveController`s the host delegates to, and reorganize `scene/`/`ui/` files into the target layout from the design doc. `GlobeChart` becomes thin orchestration: it owns controller instances, computes shared inputs once per render, and wires event callbacks between controllers.

**Tech Stack:** TypeScript (strict), Lit 3 (`ReactiveController`, `css` tagged templates), Vitest + jsdom, existing `globe.gl`/`three`/`topojson-client` deps (unchanged).

## Global Constraints

- No git commits — work stays in the uncommitted working tree so the user can test locally and decide later. Replace every "Commit" step with "Stop for review" (`git status`/`git diff --stat`, no commit).
- No behavior change to the public element (attributes, properties, events, `config` shape). Internal-only re-exports in `index.ts` are allowed to be dropped (see Task 12) — approved by the user as a pre-1.0 API trim.
- Every task must leave `npm run typecheck` and `npm test` green before moving to the next task.
- Do not touch `scripts/slim-countries.mjs`, `vite.config.ts`, `demo/vite.config.ts`, `tsconfig*.json`, `.storybook/*` — build tooling is out of scope (YAGNI, already 2026-appropriate).
- Design doc: `docs/superpowers/specs/2026-07-10-globe-chart-rewrite-design.md` — read it if a task's rationale is unclear.

---

### Task 1: Move pure core modules into `src/core/`

**Files:**
- Move: `src/types.ts` → `src/core/types.ts`
- Move: `src/config.ts` → `src/core/config.ts`
- Move: `src/color-scale.ts` → `src/core/color-scale.ts`
- Move: `src/value-index.ts` → `src/core/value-index.ts`
- Move: `src/legend-query.ts` → `src/core/legend-query.ts`
- Move: `src/iso.ts` → `src/core/iso.ts`
- Move: `src/ui/format.ts` → `src/core/format.ts`
- Move: `src/toast.ts` → `src/core/toast.ts`
- Move: `src/core.test.ts` → `src/core/core.test.ts`
- Modify: `src/globe-chart.ts`, `src/index.ts`, `src/globe-chart.test.ts`, `src/load-countries.ts`, `demo/main.ts`, `stories/globe-chart.stories.ts`

**Interfaces:** No API changes — this is a pure file relocation. Every moved file already imports its siblings via relative paths (e.g. `config.ts` imports `./types.js`); since they move together, those internal relative imports do **not** change.

- [ ] **Step 1: Move the files**

```bash
git mv src/types.ts src/core/types.ts
git mv src/config.ts src/core/config.ts
git mv src/color-scale.ts src/core/color-scale.ts
git mv src/value-index.ts src/core/value-index.ts
git mv src/legend-query.ts src/core/legend-query.ts
git mv src/iso.ts src/core/iso.ts
git mv src/ui/format.ts src/core/format.ts
git mv src/toast.ts src/core/toast.ts
git mv src/core.test.ts src/core/core.test.ts
```

- [ ] **Step 2: Fix imports in every file that references a moved module from outside `src/core/`**

In `src/globe-chart.ts`, change:
- `from './color-scale.js'` → `from './core/color-scale.js'`
- `from './config.js'` → `from './core/config.js'`
- `from './iso.js'` → `from './core/iso.js'`
- `from './toast.js'` → `from './core/toast.js'`
- `from './types.js'` → `from './core/types.js'`
- `from './value-index.js'` → `from './core/value-index.js'`
- `from './legend-query.js'` → `from './core/legend-query.js'`
(leave `./layer/choropleth-layer.js`, `./scene/globe-scene.js`, `./ui/legend.js`, `./ui/styles.js`, `./ui/toasts.js`, `./load-countries.js`, `./yield-main.js` untouched — those move in later tasks)

In `src/index.ts`, change every `from './config.js'`, `from './iso.js'`, `from './types.js'`, `from './legend-query.js'`, `from './value-index.js'` to their `./core/...js` equivalents. Leave `from './load-countries.js'` and `from './globe-chart.js'` / `from './globe-chart.mock-data.js'` unchanged.

In `src/globe-chart.test.ts`, change `from './types.js'` → `from './core/types.js'`.

In `src/load-countries.ts`, change `from './types.js'` → `from './core/types.js'`.

In `demo/main.ts`, change `from '../src/config.js'` → `from '../src/core/config.js'` and `from '../src/types.js'` → `from '../src/core/types.js'`.

In `stories/globe-chart.stories.ts`, change `from '../src/config.js'` → `from '../src/core/config.js'` and both `from '../src/types.js'` → `from '../src/core/types.js'`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors. If it reports an unresolved module, you missed an import path above — fix it and re-run.

- [ ] **Step 4: Test**

Run: `npm test`
Expected: PASS (all existing suites green).

- [ ] **Step 5: Stop for review**

```bash
git status
git diff --stat
```

No commit — leave the working tree as-is for the next task.

---

### Task 2: Move three.js scene files into `src/scene/`

**Files:**
- Move: `src/materials.ts` → `src/scene/materials.ts`
- Move: `src/layer/choropleth-layer.ts` → `src/scene/choropleth-layer.ts`
- Modify: `src/scene/globe-scene.ts`, `src/globe-chart.ts`

**Interfaces:** No behavior change. `ChoroplethLayer` keeps its existing public shape (`paint(options: ChoroplethPaintOptions)`).

- [ ] **Step 1: Move the files and remove the now-empty directory**

```bash
git mv src/materials.ts src/scene/materials.ts
git mv src/layer/choropleth-layer.ts src/scene/choropleth-layer.ts
rmdir src/layer
```

- [ ] **Step 2: Fix imports in `src/scene/choropleth-layer.ts`**

Change:
- `from '../color-scale.js'` → `from '../core/color-scale.js'`
- `from '../config.js'` → `from '../core/config.js'`
- `from '../iso.js'` → `from '../core/iso.js'`
- `from '../materials.js'` → `from './materials.js'`
- `from '../types.js'` → `from '../core/types.js'`
- `from '../ui/format.js'` → `from '../core/format.js'`

- [ ] **Step 3: Fix imports in `src/scene/globe-scene.ts`**

Change:
- `from '../config.js'` → `from '../core/config.js'`
- `from '../types.js'` → `from '../core/types.js'`

- [ ] **Step 4: Fix imports in `src/globe-chart.ts`**

Change `from './layer/choropleth-layer.js'` → `from './scene/choropleth-layer.js'`.

- [ ] **Step 5: Typecheck and test**

Run: `npm run typecheck`
Expected: PASS

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
git diff --stat
```

---

### Task 3: Rename UI render modules

**Files:**
- Move: `src/ui/legend.ts` → `src/ui/legend-view.ts`
- Move: `src/ui/toasts.ts` → `src/ui/toast-view.ts`
- Modify: `src/ui/legend-view.ts`, `src/ui/toast-view.ts`, `src/globe-chart.ts`

**Interfaces:** `renderLegend(options: LegendRenderOptions): TemplateResult` and `renderToasts(options: ToastRenderOptions): TemplateResult | typeof nothing` keep identical signatures — only their file location and import paths for `core/` modules change.

- [ ] **Step 1: Move the files**

```bash
git mv src/ui/legend.ts src/ui/legend-view.ts
git mv src/ui/toasts.ts src/ui/toast-view.ts
```

- [ ] **Step 2: Fix imports in `src/ui/legend-view.ts`**

Change:
- `from '../config.js'` → `from '../core/config.js'`
- `from '../types.js'` → `from '../core/types.js'`
- `from '../legend-query.js'` → `from '../core/legend-query.js'`
- `from './format.js'` → `from '../core/format.js'`

- [ ] **Step 3: Fix imports in `src/ui/toast-view.ts`**

Change:
- `from '../config.js'` → `from '../core/config.js'`
- `from '../types.js'` → `from '../core/types.js'`

- [ ] **Step 4: Fix imports in `src/globe-chart.ts`**

Change:
- `from './ui/legend.js'` → `from './ui/legend-view.js'`
- `from './ui/toasts.js'` → `from './ui/toast-view.js'`

- [ ] **Step 5: Typecheck and test**

Run: `npm run typecheck`
Expected: PASS

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
git diff --stat
```

---

### Task 4: Extract `core/legend-entries.ts` (pure legend view-model)

**Files:**
- Create: `src/core/legend-entries.ts`
- Create: `src/core/legend-entries.test.ts`

**Interfaces:**
- Consumes: `ThemeColors`, `GeoFeature`, `LegendEntry`, `ValueIndexResult`, `definedProps` from `./types.js`; `scaleColor` from `./color-scale.js`; `boundingBoxCenter`, `featureName`, `isoOf` from `./iso.js`; `filterLegendEntries`, `mergeLegendByIso` from `./legend-query.js`; `LegendSearchConfig`, `LegendSearchHit` from `./config.js`; `assertNever` from `./types.js`.
- Produces: `computeLegendEntries(input: LegendEntriesInput): LegendEntry[]`, `hitsToLegendEntries(hits, all, input): LegendEntry[]`, `filterLegendEntriesByMode(input: FilterLegendInput): LegendEntry[]`, and the `LegendEntriesInput`/`FilterLegendInput` interfaces — Task 10 (`globe-chart.ts` rewrite) calls all three by these exact names.

- [ ] **Step 1: Write the failing test**

Create `src/core/legend-entries.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { computeLegendEntries, filterLegendEntriesByMode, hitsToLegendEntries } from './legend-entries.js';
import type { LegendSearchConfig } from './config.js';
import type { GeoFeature, LegendEntry, ThemeColors, ValueIndexResult } from './types.js';

const colors: ThemeColors = {
	ocean: '#000',
	empty: '#eee',
	low: '#f0c419',
	high: '#c62828',
	border: '#000',
	legendBg: '#fff',
	legendFg: '#000',
	legendMuted: '#666',
};

const features: GeoFeature[] = [
	{
		properties: { i: 'US', n: 'United States' },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-100, 30],
					[-90, 30],
					[-90, 40],
					[-100, 40],
					[-100, 30],
				],
			],
		},
	},
	{
		properties: { i: 'FR', n: 'France' },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[2, 46],
					[3, 46],
					[3, 47],
					[2, 47],
					[2, 46],
				],
			],
		},
	},
];

function makeIndex(): ValueIndexResult {
	return {
		valueMap: { US: 100, FR: 40 },
		rowByIso: { US: { iso: 'US', value: 100 }, FR: { iso: 'FR', value: 40 } },
		maxValue: 100,
		skipped: [],
		validCount: 2,
	};
}

describe('computeLegendEntries', () => {
	it('builds entries sorted by value descending, using feature bbox centers', () => {
		const entries = computeLegendEntries({
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(entries.map((e) => e.iso)).toEqual(['US', 'FR']);
		expect(entries[0]?.name).toBe('United States');
		expect(entries[0]?.lat).toBeCloseTo(35, 0);
	});

	it('skips values with no matching feature', () => {
		const entries = computeLegendEntries({
			index: {
				valueMap: { DE: 5 },
				rowByIso: { DE: { iso: 'DE', value: 5 } },
				maxValue: 5,
				skipped: [],
				validCount: 1,
			},
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(entries).toEqual([]);
	});
});

describe('hitsToLegendEntries', () => {
	it('maps remote hits to entries, preferring existing lat/lng when present', () => {
		const all = computeLegendEntries({
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		const mapped = hitsToLegendEntries([{ iso: 'fr', name: 'France (remote)' }], all, {
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(mapped).toHaveLength(1);
		expect(mapped[0]?.iso).toBe('FR');
		expect(mapped[0]?.name).toBe('France (remote)');
		expect(mapped[0]?.lat).toBeCloseTo(46.5, 1);
	});

	it('drops hits with no iso and no resolvable center', () => {
		const mapped = hitsToLegendEntries([{ iso: '' }, { iso: 'ZZ' }], [], {
			index: makeIndex(),
			colors,
			countryFeatures: features,
			nameField: 'name',
		});
		expect(mapped).toEqual([]);
	});
});

describe('filterLegendEntriesByMode', () => {
	const all: LegendEntry[] = [
		{ iso: 'US', name: 'United States', value: 100, color: '#f00', lat: 0, lng: 0 },
		{ iso: 'FR', name: 'France', value: 40, color: '#0f0', lat: 0, lng: 0 },
	];
	const entriesInput = { index: makeIndex(), colors, countryFeatures: features, nameField: 'name' };

	it('returns everything when search is disabled or query is empty', () => {
		const search: LegendSearchConfig = {
			enabled: false,
			mode: 'local',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		expect(filterLegendEntriesByMode({ all, query: 'fra', search, remoteHits: [], entriesInput })).toBe(all);
		expect(
			filterLegendEntriesByMode({
				all,
				query: '  ',
				search: { ...search, enabled: true },
				remoteHits: [],
				entriesInput,
			}),
		).toBe(all);
	});

	it('filters locally in local mode', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'local',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({ all, query: 'fra', search, remoteHits: [], entriesInput });
		expect(result.map((e) => e.iso)).toEqual(['FR']);
	});

	it('falls back to local when remote mode has no hits', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'remote',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({ all, query: 'fra', search, remoteHits: [], entriesInput });
		expect(result.map((e) => e.iso)).toEqual(['FR']);
	});

	it('merges local and remote in hybrid mode', () => {
		const search: LegendSearchConfig = {
			enabled: true,
			mode: 'hybrid',
			placeholder: '',
			debounceMs: 0,
			minLength: 1,
		};
		const result = filterLegendEntriesByMode({
			all,
			query: 'fra',
			search,
			remoteHits: [{ iso: 'FR', name: 'France (remote)' }],
			entriesInput,
		});
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe('France (remote)');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/legend-entries.test.ts`
Expected: FAIL with "Cannot find module './legend-entries.js'" (or similar — the module doesn't exist yet).

- [ ] **Step 3: Implement `src/core/legend-entries.ts`**

```typescript
import type { LegendSearchConfig, LegendSearchHit } from './config.js';
import { scaleColor } from './color-scale.js';
import { boundingBoxCenter, featureName, isoOf } from './iso.js';
import { filterLegendEntries, mergeLegendByIso } from './legend-query.js';
import type { GeoFeature, LegendEntry, ThemeColors, ValueIndexResult } from './types.js';
import { assertNever, definedProps } from './types.js';

export interface LegendEntriesInput {
	index: ValueIndexResult;
	colors: ThemeColors;
	countryFeatures: readonly GeoFeature[];
	nameField: string;
}

/** Full ranked legend from the current value index (unfiltered, sorted by value desc). */
export function computeLegendEntries(input: LegendEntriesInput): LegendEntry[] {
	const { index, colors, countryFeatures, nameField } = input;

	return Object.entries(index.valueMap)
		.map(([iso, value]): LegendEntry | null => {
			const feat = countryFeatures.find((f) => isoOf(f) === iso);
			const center = feat && boundingBoxCenter(feat.geometry);
			if (!feat || !center) return null;

			const row = index.rowByIso[iso];
			const nameFromRow = row && nameField in row ? String(row[nameField] ?? '') : '';

			return {
				iso,
				name: nameFromRow || featureName(feat, iso),
				value,
				color: scaleColor(value, index.maxValue, colors),
				lat: center.lat,
				lng: center.lng,
				...definedProps({ row }),
			};
		})
		.filter((entry): entry is LegendEntry => entry !== null)
		.sort((a, b) => b.value - a.value);
}

/** Map host-driven remote search hits (ISO + optional name/value) onto full legend entries. */
export function hitsToLegendEntries(
	hits: readonly LegendSearchHit[],
	all: readonly LegendEntry[],
	input: LegendEntriesInput,
): LegendEntry[] {
	const { index, colors, countryFeatures } = input;
	const byIso = new Map(all.map((e) => [e.iso, e]));
	const out: LegendEntry[] = [];

	for (const hit of hits) {
		const iso = String(hit.iso ?? '').toUpperCase();
		if (!iso) continue;
		const existing = byIso.get(iso);
		const value = hit.value ?? existing?.value ?? index.valueMap[iso] ?? 0;
		const feat = countryFeatures.find((f) => isoOf(f) === iso);
		const center = existing
			? { lat: existing.lat, lng: existing.lng }
			: feat
				? boundingBoxCenter(feat.geometry)
				: null;
		if (!center) continue;

		out.push({
			iso,
			name: hit.name || existing?.name || (feat ? featureName(feat, iso) : iso),
			value,
			color: scaleColor(value, index.maxValue, colors),
			lat: center.lat,
			lng: center.lng,
			...definedProps({ row: existing?.row ?? index.rowByIso[iso] }),
		});
	}

	return out.sort((a, b) => b.value - a.value);
}

export interface FilterLegendInput {
	all: LegendEntry[];
	query: string;
	search: LegendSearchConfig;
	remoteHits: readonly LegendSearchHit[];
	entriesInput: LegendEntriesInput;
}

/** Apply the configured search mode (local / remote / hybrid) to the full entry list. */
export function filterLegendEntriesByMode(input: FilterLegendInput): LegendEntry[] {
	const { all, search, remoteHits, entriesInput } = input;
	const query = input.query.trim();
	if (!search.enabled || !query) return all;

	const mode = search.mode;
	const local = mode === 'remote' ? [] : filterLegendEntries(all, query);
	const remoteEntries = mode === 'local' ? [] : hitsToLegendEntries(remoteHits, all, entriesInput);

	switch (mode) {
		case 'local':
			return local;
		case 'remote':
			return remoteEntries.length ? remoteEntries : local;
		case 'hybrid':
			return mergeLegendByIso(local, remoteEntries);
		default:
			return assertNever(mode);
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/legend-entries.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
git diff --stat
```

---

### Task 5: `controllers/theme-controller.ts`

**Files:**
- Create: `src/controllers/theme-controller.ts`
- Create: `src/controllers/theme-controller.test.ts`

**Interfaces:**
- Consumes: `ColorsConfig` from `../core/config.js`, `ThemeColors` from `../core/types.js`.
- Produces: `class ThemeController` with `constructor(host: ReactiveControllerHost & HTMLElement, onChange: () => void)` and `resolve(config: ColorsConfig): ThemeColors`. Task 10 constructs it as `new ThemeController(this, () => { ... })` and calls `this.themeController.resolve(this.resolvedConfig.colors)`.

- [ ] **Step 1: Write the failing test**

Create `src/controllers/theme-controller.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

import { ThemeController } from './theme-controller.js';

function makeHost() {
	const el = document.createElement('div');
	el.style.setProperty('--globe-chart-ocean-color', '#123456');
	document.body.appendChild(el);
	return Object.assign(el, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('ThemeController', () => {
	it('registers itself with the host', () => {
		const host = makeHost();
		new ThemeController(host, () => {});
		expect(host.addController).toHaveBeenCalledTimes(1);
	});

	it('resolves colors from config over CSS custom properties over hardcoded fallbacks', () => {
		const host = makeHost();
		const controller = new ThemeController(host, () => {});
		const colors = controller.resolve({});
		expect(colors.ocean).toBe('#123456');
		expect(colors.empty).toBe('#eef6fc');

		const withConfig = controller.resolve({ ocean: '#abcdef' });
		expect(withConfig.ocean).toBe('#abcdef');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/controllers/theme-controller.test.ts`
Expected: FAIL — module `./theme-controller.js` not found.

- [ ] **Step 3: Implement `src/controllers/theme-controller.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/controllers/theme-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
```

---

### Task 6: `controllers/visibility-controller.ts`

**Files:**
- Create: `src/controllers/visibility-controller.ts`
- Create: `src/controllers/visibility-controller.test.ts`

**Interfaces:**
- Produces: `class VisibilityController` with `constructor(host: ReactiveControllerHost & HTMLElement, onChange: (visible: boolean) => void)`, a readonly `visible: boolean` getter. Task 10 constructs it once and reads `this.visibilityController.visible` in `updated()`.

- [ ] **Step 1: Write the failing test**

Create `src/controllers/visibility-controller.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

import { VisibilityController } from './visibility-controller.js';

class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = [];
	callback: (entries: { isIntersecting: boolean }[]) => void;
	observed: unknown;

	constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
		this.callback = callback;
		FakeIntersectionObserver.instances.push(this);
	}

	observe(target: unknown) {
		this.observed = target;
	}

	disconnect() {
		/* no-op */
	}

	trigger(isIntersecting: boolean) {
		this.callback([{ isIntersecting }]);
	}
}

function makeHost() {
	const el = document.createElement('div');
	return Object.assign(el, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('VisibilityController', () => {
	it('starts not-visible when IntersectionObserver is available, observes the host, and reports changes', () => {
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
		FakeIntersectionObserver.instances = [];
		const host = makeHost();
		const onChange = vi.fn();
		const controller = new VisibilityController(host, onChange);
		controller.hostConnected();

		const observer = FakeIntersectionObserver.instances[0];
		expect(observer?.observed).toBe(host);
		expect(controller.visible).toBe(false);

		observer?.trigger(true);
		expect(controller.visible).toBe(true);
		expect(onChange).toHaveBeenCalledWith(true);

		observer?.trigger(false);
		expect(onChange).toHaveBeenCalledWith(false);
		// visible latches true once seen, matching original observeVisibility() behavior
		expect(controller.visible).toBe(true);

		vi.unstubAllGlobals();
	});

	it('treats visibility as always-true when IntersectionObserver is unavailable', () => {
		vi.stubGlobal('IntersectionObserver', undefined);
		const host = makeHost();
		const controller = new VisibilityController(host, vi.fn());
		controller.hostConnected();
		expect(controller.visible).toBe(true);
		vi.unstubAllGlobals();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/controllers/visibility-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/controllers/visibility-controller.ts`**

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Wraps an IntersectionObserver on the host element. `visible` latches true
 * once the host has been seen at least once (matches globe.gl cold-start
 * deferral: create on first visibility, then just pause/resume).
 */
export class VisibilityController implements ReactiveController {
	private _visible = typeof IntersectionObserver === 'undefined';
	private observer: IntersectionObserver | undefined;
	private readonly host: ReactiveControllerHost & HTMLElement;
	private readonly onChange: (visible: boolean) => void;

	get visible(): boolean {
		return this._visible;
	}

	constructor(host: ReactiveControllerHost & HTMLElement, onChange: (visible: boolean) => void) {
		this.host = host;
		this.onChange = onChange;
		host.addController(this);
	}

	hostConnected() {
		this.observe();
	}

	hostDisconnected() {
		this._visible = typeof IntersectionObserver === 'undefined';
		this.observer?.disconnect();
		this.observer = undefined;
	}

	private observe() {
		if (typeof IntersectionObserver !== 'function') {
			this._visible = true;
			return;
		}
		this.observer?.disconnect();
		this.observer = new IntersectionObserver(
			(entries) => {
				const isVisible = entries.some((e) => e.isIntersecting);
				this._visible = isVisible || this._visible;
				this.onChange(isVisible);
			},
			{ rootMargin: '120px', threshold: 0 },
		);
		this.observer.observe(this.host);
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/controllers/visibility-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
```

---

### Task 7: `controllers/toast-controller.ts`

**Files:**
- Create: `src/controllers/toast-controller.ts`
- Create: `src/controllers/toast-controller.test.ts`

**Interfaces:**
- Consumes: `createToastState`, `pushToast`, `dismissToast`, `clearToasts`, `clearSeenCode`, `ToastState` from `../core/toast.js`; `FeedbackEventDetail`, `ToastMessage`, `definedProps` from `../core/types.js`; `ToastsConfig` from `../core/config.js`.
- Produces: `class ToastController` with `constructor(host: ReactiveControllerHost & EventTarget)`, getters `items: ToastMessage[]`, `expandedToastId: string | null`, and methods `notify(input: NotifyInput, toastsConfig: ToastsConfig)`, `dismiss(id: string)`, `toggleDetails(id: string)`, `clearSeen(code: string)`. Task 10 calls all of these by these exact names.

- [ ] **Step 1: Write the failing test**

Create `src/controllers/toast-controller.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

import { ToastController } from './toast-controller.js';
import type { ToastsConfig } from '../core/config.js';

const toastsConfig: ToastsConfig = {
	enabled: true,
	position: 'bottom-end',
	maxVisible: 3,
	persistWarnings: false,
	warningDismissMs: 8000,
};

function makeHost() {
	const target = new EventTarget();
	return Object.assign(target, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('ToastController', () => {
	it('pushes a toast, requests an update, and dispatches a warning event', () => {
		vi.useFakeTimers();
		const host = makeHost();
		const dispatched: CustomEvent[] = [];
		host.addEventListener('warning', (e) => dispatched.push(e as CustomEvent));
		const controller = new ToastController(host);

		controller.notify({ level: 'warning', title: 'Heads up', body: 'body text' }, toastsConfig);

		expect(controller.items).toHaveLength(1);
		expect(controller.items[0]?.title).toBe('Heads up');
		expect(host.requestUpdate).toHaveBeenCalled();
		expect(dispatched).toHaveLength(1);
		expect(dispatched[0]?.detail).toMatchObject({ level: 'warning', title: 'Heads up' });

		vi.useRealTimers();
	});

	it('auto-dismisses non-persisted warnings after warningDismissMs', () => {
		vi.useFakeTimers();
		const host = makeHost();
		const controller = new ToastController(host);
		controller.notify({ level: 'warning', title: 'A', body: 'a' }, toastsConfig);
		expect(controller.items).toHaveLength(1);

		vi.advanceTimersByTime(toastsConfig.warningDismissMs);
		expect(controller.items).toHaveLength(0);
		vi.useRealTimers();
	});

	it('respects once codes', () => {
		const host = makeHost();
		const controller = new ToastController(host);
		controller.notify({ level: 'info', title: 'Empty', body: 'x', code: 'empty-data', once: true }, toastsConfig);
		controller.notify({ level: 'info', title: 'Empty', body: 'x', code: 'empty-data', once: true }, toastsConfig);
		expect(controller.items).toHaveLength(1);
	});

	it('toggles details and dismisses by id', () => {
		const host = makeHost();
		const controller = new ToastController(host);
		controller.notify({ level: 'error', title: 'Bad', body: 'b', details: 'stack trace' }, toastsConfig);
		const id = controller.items[0]!.id;

		controller.toggleDetails(id);
		expect(controller.expandedToastId).toBe(id);
		controller.toggleDetails(id);
		expect(controller.expandedToastId).toBeNull();

		controller.dismiss(id);
		expect(controller.items).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/controllers/toast-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/controllers/toast-controller.ts`**

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { ToastsConfig } from '../core/config.js';
import {
	clearSeenCode,
	clearToasts,
	createToastState,
	dismissToast,
	pushToast,
	type ToastState,
} from '../core/toast.js';
import type { FeedbackEventDetail, ToastMessage } from '../core/types.js';
import { definedProps } from '../core/types.js';

export interface NotifyInput {
	level: FeedbackEventDetail['level'];
	title: string;
	body: string;
	details?: string;
	code?: string;
	once?: boolean;
}

/** Owns the toast reducer, per-toast auto-dismiss timers, and the error/warning CustomEvent dispatch. */
export class ToastController implements ReactiveController {
	private state: ToastState = createToastState();
	private expandedId: string | null = null;
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly host: ReactiveControllerHost & EventTarget;

	get items(): ToastMessage[] {
		return this.state.items;
	}

	get expandedToastId(): string | null {
		return this.expandedId;
	}

	constructor(host: ReactiveControllerHost & EventTarget) {
		this.host = host;
		host.addController(this);
	}

	hostDisconnected() {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
		this.state = clearToasts(this.state);
		this.expandedId = null;
	}

	notify(input: NotifyInput, toastsConfig: ToastsConfig) {
		const persist = input.level === 'error' || (input.level === 'warning' && toastsConfig.persistWarnings);

		this.state = pushToast(this.state, {
			...input,
			persist,
			maxVisible: toastsConfig.maxVisible,
		});
		this.host.requestUpdate();

		const latest = this.state.items[this.state.items.length - 1];
		if (!latest) return;

		const detail: FeedbackEventDetail = {
			level: latest.level,
			title: latest.title,
			body: latest.body,
			...definedProps({ details: latest.details, code: input.code }),
		};
		if (latest.level === 'error') {
			this.host.dispatchEvent(new CustomEvent('error', { detail, bubbles: true, composed: true }));
		} else if (latest.level === 'warning') {
			this.host.dispatchEvent(new CustomEvent('warning', { detail, bubbles: true, composed: true }));
		}

		if (!persist && latest.level !== 'error') {
			const ms = toastsConfig.warningDismissMs;
			clearTimeout(this.timers.get(latest.id));
			this.timers.set(
				latest.id,
				setTimeout(() => this.dismiss(latest.id), ms),
			);
		}
	}

	dismiss(id: string) {
		clearTimeout(this.timers.get(id));
		this.timers.delete(id);
		this.state = dismissToast(this.state, id);
		if (this.expandedId === id) this.expandedId = null;
		this.host.requestUpdate();
	}

	toggleDetails(id: string) {
		this.expandedId = this.expandedId === id ? null : id;
		this.host.requestUpdate();
	}

	clearSeen(code: string) {
		this.state = clearSeenCode(this.state, code);
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/controllers/toast-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
```

---

### Task 8: `controllers/legend-controller.ts`

**Files:**
- Create: `src/controllers/legend-controller.ts`
- Create: `src/controllers/legend-controller.test.ts`

**Interfaces:**
- Consumes: `GlobeChartConfig` from `../core/config.js`; `LegendEntry` from `../core/types.js`.
- Produces: `class LegendController` with `constructor(options: LegendControllerOptions)` where `LegendControllerOptions = { host: ReactiveControllerHost; getConfig: () => GlobeChartConfig; onSelect: (entry: LegendEntry) => void }`; getters/setter `selectedIso: string | null` (settable — setting triggers `requestUpdate`), getters `page: number`, `expanded: boolean`; methods `select(entry: LegendEntry)`, `setPage(page: number)`, `toggle()`, `syncBreakpointListener()`, `applyCollapseDefault()`. Task 10 uses all of these by these exact names.

- [ ] **Step 1: Write the failing test**

Create `src/controllers/legend-controller.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

import { LegendController } from './legend-controller.js';
import { DEFAULT_CONFIG, mergeConfig } from '../core/config.js';
import type { LegendEntry } from '../core/types.js';

function makeHost() {
	return {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	};
}

const entry: LegendEntry = { iso: 'FR', name: 'France', value: 10, color: '#000', lat: 46, lng: 2 };

describe('LegendController', () => {
	it('select() sets selectedIso, invokes onSelect, and requests an update', () => {
		const host = makeHost();
		const onSelect = vi.fn();
		const controller = new LegendController({
			host,
			getConfig: () => mergeConfig().config,
			onSelect,
		});

		controller.select(entry);
		expect(controller.selectedIso).toBe('FR');
		expect(onSelect).toHaveBeenCalledWith(entry);
		expect(host.requestUpdate).toHaveBeenCalled();
	});

	it('setPage / toggle update state and request updates', () => {
		const host = makeHost();
		const controller = new LegendController({ host, getConfig: () => mergeConfig().config, onSelect: vi.fn() });
		controller.setPage(3);
		expect(controller.page).toBe(3);
		const wasExpanded = controller.expanded;
		controller.toggle();
		expect(controller.expanded).toBe(!wasExpanded);
	});

	it('applyCollapseDefault respects collapseMode never/always', () => {
		const host = makeHost();
		const never = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseMode: 'never' } }).config,
			onSelect: vi.fn(),
		});
		never.applyCollapseDefault();
		expect(never.expanded).toBe(true);

		const always = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseMode: 'always' } }).config,
			onSelect: vi.fn(),
		});
		always.applyCollapseDefault();
		expect(always.expanded).toBe(false);
	});

	it('collapses after select when collapseOnSelect is always', () => {
		const host = makeHost();
		const controller = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseOnSelect: 'always' } }).config,
			onSelect: vi.fn(),
		});
		controller.select(entry);
		expect(controller.expanded).toBe(false);
	});

	it('never collapses after select when collapseOnSelect is never', () => {
		const host = makeHost();
		const controller = new LegendController({
			host,
			getConfig: () => mergeConfig({ legend: { collapseOnSelect: 'never' } }).config,
			onSelect: vi.fn(),
		});
		controller.select(entry);
		expect(controller.expanded).toBe(true);
	});

	it('default config values line up with DEFAULT_CONFIG.legend', () => {
		expect(DEFAULT_CONFIG.legend.collapseMode).toBe('mobile');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/controllers/legend-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/controllers/legend-controller.ts`**

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { GlobeChartConfig } from '../core/config.js';
import type { LegendEntry } from '../core/types.js';

export interface LegendControllerOptions {
	host: ReactiveControllerHost;
	getConfig: () => GlobeChartConfig;
	onSelect: (entry: LegendEntry) => void;
}

/** Owns legend selection, paging, and open/collapsed panel state. */
export class LegendController implements ReactiveController {
	private _selectedIso: string | null = null;
	private _page = 1;
	private _expanded = true;
	private mq: MediaQueryList | undefined;
	private readonly host: ReactiveControllerHost;
	private readonly getConfig: () => GlobeChartConfig;
	private readonly onSelectCb: (entry: LegendEntry) => void;
	private readonly onBreakpointChange = () => this.applyCollapseDefault();

	get selectedIso(): string | null {
		return this._selectedIso;
	}

	set selectedIso(value: string | null) {
		if (this._selectedIso === value) return;
		this._selectedIso = value;
		this.host.requestUpdate();
	}

	get page(): number {
		return this._page;
	}

	get expanded(): boolean {
		return this._expanded;
	}

	constructor(options: LegendControllerOptions) {
		this.host = options.host;
		this.getConfig = options.getConfig;
		this.onSelectCb = options.onSelect;
		options.host.addController(this);
	}

	hostDisconnected() {
		this.mq?.removeEventListener('change', this.onBreakpointChange);
		this.mq = undefined;
	}

	select(entry: LegendEntry) {
		this.selectedIso = entry.iso;
		this.onSelectCb(entry);
		this.maybeCollapseAfterSelect();
	}

	setPage(page: number) {
		this._page = page;
		this.host.requestUpdate();
	}

	toggle() {
		this._expanded = !this._expanded;
		this.host.requestUpdate();
	}

	/** Re-bind the mobile-breakpoint listener after config changes (collapseMode/collapseOnSelect). */
	syncBreakpointListener() {
		this.mq?.removeEventListener('change', this.onBreakpointChange);
		this.mq = undefined;
		const legend = this.getConfig().legend;
		const needsMq = legend.collapsible && (legend.collapseMode === 'mobile' || legend.collapseOnSelect === 'mobile');
		if (typeof matchMedia !== 'function' || !needsMq) return;
		this.mq = matchMedia(legend.mobileBreakpoint);
		this.mq.addEventListener('change', this.onBreakpointChange);
	}

	applyCollapseDefault() {
		const legend = this.getConfig().legend;
		if (!legend.collapsible || legend.collapseMode === 'never') {
			this._expanded = true;
		} else if (legend.collapseMode === 'always') {
			this._expanded = false;
		} else {
			const mobile = this.mq?.matches ?? false;
			this._expanded = !mobile;
		}
		this.host.requestUpdate();
	}

	private maybeCollapseAfterSelect() {
		const legend = this.getConfig().legend;
		if (!legend.collapsible) return;
		const mode = legend.collapseOnSelect;
		if (mode === 'never') return;
		if (mode === 'always') {
			this._expanded = false;
			this.host.requestUpdate();
			return;
		}
		const mobile = this.mq?.matches ?? (typeof matchMedia === 'function' && matchMedia(legend.mobileBreakpoint).matches);
		if (mobile) {
			this._expanded = false;
			this.host.requestUpdate();
		}
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/controllers/legend-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
```

---

### Task 9: `controllers/search-controller.ts`

**Files:**
- Create: `src/controllers/search-controller.ts`
- Create: `src/controllers/search-controller.test.ts`

**Interfaces:**
- Consumes: `GlobeChartConfig`, `LegendSearchHit` from `../core/config.js`; `LegendSearchEventDetail` from `../core/types.js`.
- Produces: `class SearchController` with `constructor(options: SearchControllerOptions)` where `SearchControllerOptions = { host: ReactiveControllerHost & EventTarget; getConfig: () => GlobeChartConfig; getLegendResults: () => LegendSearchHit[] | null }`; getters `query: string`, `searching: boolean`, `error: string | null`; methods `effectiveHits(): LegendSearchHit[]`, `onQueryInput(query: string)`, `onLegendResultsChanged()`. Task 10 uses all of these by these exact names.

- [ ] **Step 1: Write the failing test**

Create `src/controllers/search-controller.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';

import { SearchController } from './search-controller.js';
import { mergeConfig } from '../core/config.js';
import type { LegendSearchHit } from '../core/config.js';

function makeHost() {
	const target = new EventTarget();
	return Object.assign(target, {
		addController: vi.fn(),
		removeController: vi.fn(),
		requestUpdate: vi.fn(),
		updateComplete: Promise.resolve(true),
	});
}

describe('SearchController', () => {
	it('does nothing when search is disabled', () => {
		const host = makeHost();
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig().config,
			getLegendResults: () => null,
		});
		controller.onQueryInput('fra');
		expect(controller.query).toBe('fra');
		expect(controller.searching).toBe(false);
	});

	it('filters locally without a debounce delay when mode is local', () => {
		const host = makeHost();
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig({ legend: { search: { enabled: true, mode: 'local' } } }).config,
			getLegendResults: () => null,
		});
		controller.onQueryInput('fra');
		expect(controller.searching).toBe(false);
		expect(controller.effectiveHits()).toEqual([]);
	});

	it('debounces and calls the provider in remote mode, dispatching a legend-search event', async () => {
		vi.useFakeTimers();
		const host = makeHost();
		const events: CustomEvent[] = [];
		host.addEventListener('legend-search', (e) => events.push(e as CustomEvent));
		const hits: LegendSearchHit[] = [{ iso: 'DE', name: 'Germany' }];
		const provider = vi.fn().mockResolvedValue(hits);
		const controller = new SearchController({
			host,
			getConfig: () =>
				mergeConfig({ legend: { search: { enabled: true, mode: 'remote', debounceMs: 100, provider } } }).config,
			getLegendResults: () => null,
		});

		controller.onQueryInput('ger');
		expect(controller.searching).toBe(false); // not yet — still debouncing
		await vi.advanceTimersByTimeAsync(100);

		expect(provider).toHaveBeenCalledWith('ger', expect.anything());
		expect(events).toHaveLength(1);
		expect(controller.effectiveHits()).toEqual(hits);
		expect(controller.searching).toBe(false);
		vi.useRealTimers();
	});

	it('prefers host-driven legendResults over its own remote hits', () => {
		const host = makeHost();
		const external: LegendSearchHit[] = [{ iso: 'US' }];
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig({ legend: { search: { enabled: true, mode: 'remote' } } }).config,
			getLegendResults: () => external,
		});
		expect(controller.effectiveHits()).toBe(external);
	});

	it('onLegendResultsChanged clears the searching flag', () => {
		const host = makeHost();
		const controller = new SearchController({
			host,
			getConfig: () => mergeConfig().config,
			getLegendResults: () => [],
		});
		controller.onLegendResultsChanged();
		expect(controller.searching).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/controllers/search-controller.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/controllers/search-controller.ts`**

```typescript
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type { GlobeChartConfig, LegendSearchHit } from '../core/config.js';
import type { LegendSearchEventDetail } from '../core/types.js';

export interface SearchControllerOptions {
	host: ReactiveControllerHost & EventTarget;
	getConfig: () => GlobeChartConfig;
	getLegendResults: () => LegendSearchHit[] | null;
}

/** Owns the legend search query, debounce, remote provider invocation, and abort lifecycle. */
export class SearchController implements ReactiveController {
	private _query = '';
	private remoteHits: LegendSearchHit[] = [];
	private _searching = false;
	private _error: string | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private abort: AbortController | undefined;
	private readonly host: ReactiveControllerHost & EventTarget;
	private readonly getConfig: () => GlobeChartConfig;
	private readonly getLegendResults: () => LegendSearchHit[] | null;

	get query(): string {
		return this._query;
	}

	get searching(): boolean {
		return this._searching;
	}

	get error(): string | null {
		return this._error;
	}

	constructor(options: SearchControllerOptions) {
		this.host = options.host;
		this.getConfig = options.getConfig;
		this.getLegendResults = options.getLegendResults;
		options.host.addController(this);
	}

	hostDisconnected() {
		clearTimeout(this.debounceTimer);
		this.abort?.abort();
	}

	/** Host-driven `legendResults` wins when set; otherwise fall back to our own provider hits. */
	effectiveHits(): LegendSearchHit[] {
		const external = this.getLegendResults();
		return external != null ? external : this.remoteHits;
	}

	/** Call when the host's `legendResults` property changes to a non-null value. */
	onLegendResultsChanged() {
		this._searching = false;
		this.host.requestUpdate();
	}

	onQueryInput(query: string) {
		this._query = query;
		this._error = null;
		const search = this.getConfig().legend.search;

		if (!search.enabled) {
			this.host.requestUpdate();
			return;
		}

		clearTimeout(this.debounceTimer);
		const trimmed = query.trim();

		if (search.mode === 'local') {
			this.remoteHits = [];
			this._searching = false;
			this.host.requestUpdate();
			return;
		}

		if (trimmed.length < search.minLength) {
			this.abort?.abort();
			this.remoteHits = [];
			this._searching = false;
			this.host.requestUpdate();
			return;
		}

		this.host.requestUpdate();
		this.debounceTimer = setTimeout(() => {
			void this.run(trimmed);
		}, search.debounceMs);
	}

	private async run(query: string) {
		const search = this.getConfig().legend.search;
		this.abort?.abort();
		const abort = new AbortController();
		this.abort = abort;

		const detail: LegendSearchEventDetail = { query, signal: abort.signal };
		this.host.dispatchEvent(new CustomEvent('legend-search', { detail, bubbles: true, composed: true }));

		if (!search.provider) {
			// Host is expected to set `legendResults` from the event.
			this._searching = this.getLegendResults() == null;
			this.host.requestUpdate();
			return;
		}

		this._searching = true;
		this._error = null;
		this.host.requestUpdate();
		try {
			const hits = await search.provider(query, abort.signal);
			if (abort.signal.aborted) return;
			this.remoteHits = hits ?? [];
		} catch (err) {
			if (abort.signal.aborted) return;
			this.remoteHits = [];
			this._error = err instanceof Error ? err.message : 'Search failed';
		} finally {
			if (!abort.signal.aborted) this._searching = false;
			this.host.requestUpdate();
		}
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/controllers/search-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Stop for review**

```bash
git status
```

---

### Task 10: Rewrite `globe-chart.ts` to use the controllers

**Files:**
- Modify: `src/globe-chart.ts` (full rewrite)
- Modify: `src/globe-chart.test.ts` (import path only)

**Interfaces:**
- Consumes: `ThemeController` (Task 5), `VisibilityController` (Task 6), `ToastController` (Task 7), `LegendController` (Task 8), `SearchController` (Task 9), `computeLegendEntries`/`filterLegendEntriesByMode` (Task 4).
- Produces: `GlobeChart` — identical public attributes/properties/events/`config` shape as before. `scene: GlobeScene` stays a direct instance property (unchanged) — `globe-chart.test.ts` reaches into `(el as unknown as { scene: { globe } }).scene.globe` and must keep working unmodified.

- [ ] **Step 1: Update the test's import path**

In `src/globe-chart.test.ts`, no changes are needed beyond what Task 1 already did (`from './core/types.js'` — but this test file doesn't actually import `types.js` directly; skip this step if `git diff src/globe-chart.test.ts` from Task 1 already shows the fix applied). Run `grep -n "from '\./" src/globe-chart.test.ts` to confirm there are no remaining `./types.js`/`./config.js` style imports pointing at moved files — there should be none left (the test only imports `./globe-chart.mock-data.js` and `./globe-chart.js`, plus mocks `globe.gl`/`./load-countries`).

- [ ] **Step 2: Rewrite `src/globe-chart.ts`**

Replace the entire file with:

```typescript
import { html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { LegendController } from './controllers/legend-controller.js';
import { SearchController } from './controllers/search-controller.js';
import { ThemeController } from './controllers/theme-controller.js';
import { ToastController } from './controllers/toast-controller.js';
import { VisibilityController } from './controllers/visibility-controller.js';
import { scaleColor } from './core/color-scale.js';
import {
	DEFAULT_CONFIG,
	mergeConfig,
	type GlobeChartConfig,
	type GlobeChartConfigInput,
	type LegendSearchHit,
} from './core/config.js';
import { boundingBoxCenter, featureName, isoOf } from './core/iso.js';
import { computeLegendEntries, filterLegendEntriesByMode } from './core/legend-entries.js';
import { paginateItems } from './core/legend-query.js';
import type {
	CountryEventDetail,
	DataRow,
	FeedbackEventDetail,
	GeoFeature,
	GlobeChartEventMap,
	LegendEntry,
	LegendSearchEventDetail,
	ThemeColors,
} from './core/types.js';
import { definedProps, isGeoFeature } from './core/types.js';
import { buildValueIndex, parseDataRows } from './core/value-index.js';
import { loadCountryFeatures } from './load-countries.js';
import { ChoroplethLayer } from './scene/choropleth-layer.js';
import { GlobeScene } from './scene/globe-scene.js';
import { renderLegend } from './ui/legend-view.js';
import { globeChartStyles } from './ui/styles.js';
import { renderToasts } from './ui/toast-view.js';
import { yieldToMain } from './yield-main.js';

@customElement('globe-chart')
export class GlobeChart extends LitElement {
	static override styles = globeChartStyles;

	declare addEventListener: {
		<K extends keyof GlobeChartEventMap>(
			type: K,
			listener: (this: GlobeChart, ev: GlobeChartEventMap[K]) => void,
			options?: boolean | AddEventListenerOptions,
		): void;
		(
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions,
		): void;
	};

	declare removeEventListener: {
		<K extends keyof GlobeChartEventMap>(
			type: K,
			listener: (this: GlobeChart, ev: GlobeChartEventMap[K]) => void,
			options?: boolean | EventListenerOptions,
		): void;
		(
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | EventListenerOptions,
		): void;
	};

	@property({ type: Array }) data: DataRow[] = [];

	@property({ attribute: 'iso-field' }) isoField = 'iso';

	@property({ attribute: 'value-field' }) valueField = 'value';

	@property({ attribute: 'name-field' }) nameField = 'name';

	@property({ type: Boolean }) loading = false;

	@property({ type: Boolean, attribute: 'legend' }) showLegend = false;

	@property({ attribute: 'legend-position', reflect: true }) legendPosition: 'left' | 'right' =
		'left';

	@property({ type: Boolean }) animated = true;

	@property({ type: Boolean, attribute: 'auto-rotate' }) autoRotate = false;

	@property({ type: Number, attribute: 'auto-rotate-speed' }) autoRotateSpeed = 0.35;

	@property({ type: Boolean, attribute: 'auto-center' }) autoCenter = true;

	@property({ type: Boolean, attribute: 'animate-navigation' }) animateNavigation = true;

	/** Color theme: `light`, `dark`, or `auto` (follow OS). Default `auto`. */
	@property({ reflect: true }) theme: 'light' | 'dark' | 'auto' = 'auto';

	@property({ type: Object, attribute: false })
	config: GlobeChartConfigInput = {};

	/**
	 * Host-driven remote search results (ISO hits). When non-null in `remote` /
	 * `hybrid` mode, these feed the legend list (joined with map values/colors).
	 * Set to `null` to clear and fall back to provider / local filtering.
	 */
	@property({ type: Array, attribute: false })
	legendResults: LegendSearchHit[] | null = null;

	@state() private countryFeatures: GeoFeature[] = [];

	@query('.container') private readonly container?: HTMLDivElement;

	private readonly scene = new GlobeScene();
	private readonly layer = new ChoroplethLayer();
	private resolvedConfig: GlobeChartConfig = mergeConfig().config;
	private globeCreating = false;
	/** Bumped on disconnect / re-create to abandon in-flight WebGL inits. */
	private createGeneration = 0;
	private hasCentered = false;
	private loadingViewReady = false;
	/** First choropleth paint uses 0ms transitions to avoid a multi-hundred-ms long task. */
	private hasPaintedPolygons = false;
	private polygonClickBound = false;
	private readyDispatched = false;
	private lastSkipSignature = '';
	private revealTimer: ReturnType<typeof setTimeout> | undefined;

	private readonly themeController = new ThemeController(this, () => {
		if (this.theme === 'auto' && this.scene.globe) this.applyVisual(false);
	});

	/** Defer WebGL until the host is near the viewport (demo/pages cold load). */
	private readonly visibilityController = new VisibilityController(this, (visible) => {
		if (visible) {
			if (!this.scene.globe && !this.globeCreating) void this.createGlobe();
			else if (this.resolvedConfig.globe.pauseWhenHidden) this.scene.kick();
		} else if (this.scene.globe && this.resolvedConfig.globe.pauseWhenHidden) {
			this.scene.setPaused(true);
		}
	});

	private readonly toastController = new ToastController(this);

	private readonly legendController = new LegendController({
		host: this,
		getConfig: () => this.resolvedConfig,
		onSelect: (entry) => {
			this.scene.pointOfView(
				{ lat: entry.lat, lng: entry.lng, altitude: this.resolvedConfig.camera.jumpAltitude },
				this.motionMs(this.resolvedConfig.camera.durations.navigate, 'camera'),
			);
			this.emitCountry('country-select', entry);
		},
	});

	private readonly searchController = new SearchController({
		host: this,
		getConfig: () => this.resolvedConfig,
		getLegendResults: () => this.legendResults,
	});

	override connectedCallback() {
		super.connectedCallback();
		this.legendController.syncBreakpointListener();
		this.legendController.applyCollapseDefault();
	}

	override render() {
		const index = this.computeIndex();
		const colors = this.themeController.resolve(this.resolvedConfig.colors);
		const entriesInput = {
			index,
			colors,
			countryFeatures: this.countryFeatures,
			nameField: this.nameField,
		};
		const legendConfig = { ...this.resolvedConfig.legend, position: this.legendPosition };
		const all = computeLegendEntries(entriesInput);
		const filtered = filterLegendEntriesByMode({
			all,
			query: this.searchController.query,
			search: legendConfig.search,
			remoteHits: this.searchController.effectiveHits(),
			entriesInput,
		});
		const page = paginateItems(filtered, this.legendController.page, legendConfig.pageSize);

		const legend =
			this.showLegend && !this.loading
				? renderLegend({
						entries: filtered,
						selectedIso: this.legendController.selectedIso,
						config: legendConfig,
						query: this.searchController.query,
						page,
						searching: this.searchController.searching,
						searchError: this.searchController.error,
						expanded: this.legendController.expanded,
						onSelect: (entry) => this.legendController.select(entry),
						onQueryInput: (query) => this.onLegendQueryInput(query),
						onPageChange: (next) => this.legendController.setPage(next),
						onToggle: () => this.legendController.toggle(),
					})
				: null;

		const toasts =
			this.resolvedConfig.toasts.enabled
				? renderToasts({
						items: this.toastController.items,
						position: this.resolvedConfig.toasts.position,
						expandedId: this.toastController.expandedToastId,
						onDismiss: (id) => this.toastController.dismiss(id),
						onToggleDetails: (id) => this.toastController.toggleDetails(id),
					})
				: null;

		return html`
			<div class="globe-area">
				<div class="container"></div>
				${legend} ${toasts}
			</div>
		`;
	}

	private onLegendQueryInput(query: string) {
		this.legendController.setPage(1);
		this.searchController.onQueryInput(query);
	}

	protected override willUpdate(changed: PropertyValues<this>) {
		if (changed.has('config') || changed.has('legendPosition')) {
			this.applyConfigMerge();
		}
		if (changed.has('config')) {
			this.legendController.syncBreakpointListener();
			this.legendController.applyCollapseDefault();
		}
	}

	protected override updated(changed: PropertyValues<this>) {
		if (changed.has('legendResults') && this.legendResults != null) {
			this.searchController.onLegendResultsChanged();
			this.legendController.setPage(1);
		}

		if (!this.scene.globe) {
			if (!this.globeCreating && this.visibilityController.visible) void this.createGlobe();
			return;
		}

		const visualChanged =
			changed.has('data') ||
			changed.has('isoField') ||
			changed.has('valueField') ||
			changed.has('nameField') ||
			changed.has('loading') ||
			changed.has('animated') ||
			changed.has('autoCenter') ||
			changed.has('animateNavigation') ||
			changed.has('config') ||
			changed.has('theme');

		if (visualChanged) {
			this.applyVisual(changed.has('loading'));
			return;
		}

		if (changed.has('autoRotate') || changed.has('autoRotateSpeed')) {
			this.scene.syncRotation({
				loading: this.loading,
				autoRotate: this.autoRotate,
				autoRotateSpeed: this.autoRotateSpeed,
				config: this.resolvedConfig,
			});
		}
	}

	private applyConfigMerge() {
		const { config, unknownKeys, invalid, invalidPaths } = mergeConfig(this.config);
		if (this.legendPosition === 'left' || this.legendPosition === 'right') {
			config.legend.position = this.legendPosition;
		}
		this.resolvedConfig = config;
		this.syncLegendMaxHeight();

		if (invalid) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Invalid configuration',
					body: 'The config value was ignored. Pass a plain object with known keys.',
					code: 'invalid-config',
					once: true,
				},
				config.toasts,
			);
		} else if (unknownKeys.length) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Unknown config keys',
					body: `Ignored: ${unknownKeys.join(', ')}.`,
					details: unknownKeys.join('\n'),
					code: 'unknown-config-keys',
					once: true,
				},
				config.toasts,
			);
		} else if (invalidPaths.length) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Invalid config values',
					body: `Coerced or ignored: ${invalidPaths.join(', ')}.`,
					details: invalidPaths.join('\n'),
					code: 'invalid-config-paths',
					once: true,
				},
				config.toasts,
			);
		}
	}

	private syncLegendMaxHeight() {
		const maxHeight = this.resolvedConfig.legend.maxHeight?.trim();
		if (maxHeight) {
			this.style.setProperty('--globe-chart-legend-max-height', maxHeight);
		} else {
			this.style.removeProperty('--globe-chart-legend-max-height');
		}
	}

	private async createGlobe() {
		const el = this.container;
		if (!el || this.globeCreating || !this.isConnected) return;
		this.globeCreating = true;
		const generation = ++this.createGeneration;
		this.applyConfigMerge();

		try {
			// Let the host page paint chrome before pulling in globe.gl / TopoJSON.
			await yieldToMain();
			if (generation !== this.createGeneration || !this.isConnected) return;

			const [, countries] = await Promise.all([
				this.scene.create({
					element: el,
					config: this.resolvedConfig,
					motionMs: (ms, kind) => this.motionMs(ms, kind),
				}),
				loadCountryFeatures(),
			]);

			// Aborted: this instance was torn down mid-init.
			if (generation !== this.createGeneration || !this.isConnected) {
				this.scene.destroy();
				return;
			}

			this.countryFeatures = countries;
			if (!this.countryFeatures.length) {
				this.toastController.notify(
					{
						level: 'error',
						title: 'Map data missing',
						body: 'Country polygons failed to load. Check the package assets and try again.',
						code: 'geojson-empty',
					},
					this.resolvedConfig.toasts,
				);
			}

			// Split WebGL construct vs polygon mesh build across frames.
			await yieldToMain();
			if (generation !== this.createGeneration || !this.isConnected) {
				this.scene.destroy();
				return;
			}

			this.applyVisual(false);

			if (!this.readyDispatched) {
				this.readyDispatched = true;
				this.dispatchEvent(new CustomEvent('ready', { bubbles: true, composed: true }));
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			if (generation !== this.createGeneration || !this.isConnected) {
				this.scene.destroy();
				return;
			}
			const message = err instanceof Error ? err.message : String(err);
			this.toastController.notify(
				{
					level: 'error',
					title: 'Couldn’t start the globe',
					body: 'WebGL or map assets failed to initialize. Try another browser or disable blockers.',
					details: message,
					code: 'globe-init-failed',
				},
				this.resolvedConfig.toasts,
			);
		} finally {
			if (generation === this.createGeneration) this.globeCreating = false;
		}
	}

	private computeIndex() {
		const parsed = parseDataRows(this.data);
		if (parsed.invalid) {
			this.toastController.notify(
				{
					level: 'warning',
					title: 'Invalid data',
					body: 'Expected an array of row objects. Data was ignored.',
					code: 'invalid-data',
					once: true,
				},
				this.resolvedConfig.toasts,
			);
		}
		return buildValueIndex({
			data: parsed.rows,
			isoField: this.isoField,
			valueField: this.valueField,
		});
	}

	private currentLegendEntries(): LegendEntry[] {
		return computeLegendEntries({
			index: this.computeIndex(),
			colors: this.themeController.resolve(this.resolvedConfig.colors),
			countryFeatures: this.countryFeatures,
			nameField: this.nameField,
		});
	}

	private applyVisual(loadingChanged: boolean) {
		const globe = this.scene.globe;
		if (!globe) return;

		const index = this.computeIndex();
		const colors = this.themeController.resolve(this.resolvedConfig.colors);
		const isLoading = this.loading;
		// Instant first mesh build — animated polygon morphs on cold start are a long task.
		const duration = this.hasPaintedPolygons
			? this.motionMs(this.resolvedConfig.camera.durations.polygon)
			: 0;

		this.reportDataFeedback(index, isLoading);

		this.layer.paint({
			globe,
			features: this.countryFeatures,
			index,
			colors,
			config: this.resolvedConfig,
			loading: isLoading,
			transitionMs: duration,
			nameField: this.nameField,
		});
		this.hasPaintedPolygons = true;
		try {
			globe.enablePointerInteraction(true);
		} catch {
			/* older globe.gl */
		}

		if (!this.polygonClickBound) {
			this.polygonClickBound = true;
			globe.onPolygonClick((poly) => this.handlePolygonClick(poly));
		}

		this.scene.syncRotation({
			loading: isLoading,
			autoRotate: this.autoRotate,
			autoRotateSpeed: this.autoRotateSpeed,
			config: this.resolvedConfig,
		});
		// Wake long enough for the mesh/transition to land, then idle-pause (unless spinning).
		this.scene.kick(Math.max(duration, 120) + 80);

		if (isLoading) {
			clearTimeout(this.revealTimer);
			this.hasCentered = false;
			this.legendController.selectedIso = null;
			if (loadingChanged) this.loadingViewReady = false;
			if (!this.loadingViewReady) {
				this.scene.pointOfView({ ...this.resolvedConfig.camera.initial }, 0);
				this.loadingViewReady = true;
			}
			return;
		}

		this.loadingViewReady = false;

		if (!this.hasCentered || loadingChanged) {
			this.hasCentered = true;
			clearTimeout(this.revealTimer);

			if (!this.autoCenter) {
				if (loadingChanged) {
					this.scene.pointOfView({ ...this.resolvedConfig.camera.initial }, 0);
				}
				return;
			}

			const cameraMs = loadingChanged
				? this.resolvedConfig.camera.durations.reveal
				: this.resolvedConfig.camera.durations.navigate;
			const startFly = () => this.centerOnBiggestValue(cameraMs);
			if (loadingChanged && this.animated && this.animateNavigation) {
				this.revealTimer = setTimeout(startFly, 50);
			} else {
				// First reveal: point camera without waiting on a nested timeout.
				startFly();
			}
		}
	}

	private handlePolygonClick(poly: object) {
		if (this.loading) return;
		if (!isGeoFeature(poly)) return;
		const feature = poly;
		const iso = isoOf(feature);
		if (!iso) return;
		const index = this.computeIndex();
		const colors = this.themeController.resolve(this.resolvedConfig.colors);
		const fromLegend = this.currentLegendEntries().find((e) => e.iso === iso);
		if (fromLegend) {
			this.legendController.select(fromLegend);
			return;
		}
		const center = boundingBoxCenter(feature.geometry);
		if (!center) return;
		const value = index.valueMap[iso] ?? 0;
		const entry: LegendEntry = {
			iso,
			name: featureName(feature, iso),
			value,
			color: scaleColor(value, index.maxValue, colors),
			lat: center.lat,
			lng: center.lng,
			...definedProps({ row: index.rowByIso[iso] }),
		};
		this.legendController.select(entry);
	}

	private reportDataFeedback(
		index: ReturnType<typeof buildValueIndex>,
		isLoading: boolean,
	) {
		if (isLoading) return;

		if (index.skipped.length) {
			const signature = `${index.skipped.length}:${index.skipped.map((s) => `${s.index}-${s.reason}`).join(',')}`;
			if (signature !== this.lastSkipSignature) {
				this.lastSkipSignature = signature;
				const details = index.skipped
					.map((s) => `Row ${s.index}: ${s.reason}`)
					.join('\n');
				this.toastController.notify(
					{
						level: 'warning',
						title: `${index.skipped.length} row${index.skipped.length === 1 ? '' : 's'} skipped`,
						body: 'Missing ISO codes or non-numeric values were ignored.',
						details,
						code: 'data-skipped',
					},
					this.resolvedConfig.toasts,
				);
			}
		} else {
			this.lastSkipSignature = '';
		}

		if (!this.data.length || index.validCount === 0) {
			this.toastController.notify(
				{
					level: 'info',
					title: 'No country values',
					body: 'Pass a data array with ISO codes and numeric values to color the map.',
					code: 'empty-data',
					once: true,
				},
				this.resolvedConfig.toasts,
			);
		} else {
			this.toastController.clearSeen('empty-data');
		}
	}

	private centerOnBiggestValue(durationMs: number) {
		const top = this.currentLegendEntries()[0];
		if (top) {
			this.legendController.selectedIso = top.iso;
			this.scene.pointOfView(
				{
					lat: top.lat,
					lng: top.lng,
					altitude: this.resolvedConfig.camera.initial.altitude,
				},
				this.motionMs(durationMs, 'camera'),
			);
		} else {
			this.legendController.selectedIso = null;
			this.scene.pointOfView(
				{ ...this.resolvedConfig.camera.initial },
				this.motionMs(durationMs, 'camera'),
			);
		}
	}

	private motionMs(ms: number, kind: 'polygon' | 'camera' = 'polygon'): number {
		if (!this.animated) return 0;
		if (kind === 'camera' && !this.animateNavigation) return 0;
		if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return 0;
		}
		return ms;
	}

	private emitCountry(name: 'country-select' | 'country-hover', entry: LegendEntry) {
		const detail: CountryEventDetail = {
			iso: entry.iso,
			name: entry.name,
			value: entry.value,
			color: entry.color,
			...definedProps({
				lat: entry.lat,
				lng: entry.lng,
				row: entry.row,
			}),
		};
		this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.createGeneration += 1;
		this.globeCreating = false;
		this.hasPaintedPolygons = false;
		this.polygonClickBound = false;
		this.hasCentered = false;
		this.readyDispatched = false;
		clearTimeout(this.revealTimer);
		this.scene.destroy();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'globe-chart': GlobeChart;
	}

	interface HTMLElementEventMap {
		ready: CustomEvent<undefined>;
		'country-select': CustomEvent<CountryEventDetail>;
		'country-hover': CustomEvent<CountryEventDetail>;
		'legend-search': CustomEvent<LegendSearchEventDetail>;
	}
}
```

Note: `ThemeColors` and `DEFAULT_CONFIG` are imported but only `DEFAULT_CONFIG` was in the original file's import list without direct use elsewhere in this file besides the default fallback in `resolvedConfig = mergeConfig().config` — keep both imports only if `tsc`/`eslint` flags them as used; if `DEFAULT_CONFIG` or `ThemeColors` is reported unused by typecheck, remove it from the import list (they are not referenced by name anywhere else in this rewritten file — `mergeConfig()` already applies `DEFAULT_CONFIG` internally).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If `DEFAULT_CONFIG` or `ThemeColors` are reported as unused imports, remove them from the `import` statements at the top of `globe-chart.ts`.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — every test in `src/globe-chart.test.ts`, `src/core/core.test.ts`, `src/core/legend-entries.test.ts`, and all `src/controllers/*.test.ts` green.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: PASS, produces `dist/globe-chart.js` and declaration files with no errors.

- [ ] **Step 6: Stop for review**

```bash
git status
git diff --stat
```

---

### Task 11: Split `ui/styles.ts` into `ui/styles/*`

**Files:**
- Create: `src/ui/styles/tokens.ts`
- Create: `src/ui/styles/host.styles.ts`
- Create: `src/ui/styles/legend.styles.ts`
- Create: `src/ui/styles/toast.styles.ts`
- Create: `src/ui/styles/tooltip.styles.ts`
- Create: `src/ui/styles/index.ts`
- Delete: `src/ui/styles.ts`
- Modify: `src/globe-chart.ts` (import path only)

**Interfaces:** `globeChartStyles` keeps the same name and is still importable from `./ui/styles.js`... except the file moves, so the import path in `globe-chart.ts` changes to `./ui/styles/index.js`. `globeChartStyles` changes type from a single `CSSResult` to a `CSSResultGroup` (array) — Lit's `static styles` accepts both, so no consumer-visible change.

- [ ] **Step 1: Create `src/ui/styles/tokens.ts`**

```typescript
import { css } from 'lit';

/** Frosted glass panel used by the legend, legend toggle, and toasts. */
export const glassPanel = css`
	background: var(--globe-chart-legend-bg);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	box-shadow:
		0 2px 12px rgba(0, 0, 0, 0.12),
		0 1px 3px rgba(0, 0, 0, 0.08);
`;

/** Focus outline for text inputs. */
export const focusRing = css`
	outline: 2px solid color-mix(in srgb, var(--globe-chart-low-color) 70%, transparent);
	outline-offset: 1px;
`;

/** Subtle hover/focus background used by rows and buttons. */
export const mutedHoverBg = css`
	outline: none;
	background: color-mix(in srgb, var(--globe-chart-legend-fg) 8%, transparent);
`;

/** Default choropleth tokens — clear blue sea, yellow→red scale. */
export const lightTokens = css`
	--globe-chart-ocean-color: #c8e0f5;
	--globe-chart-empty-color: #eef6fc;
	--globe-chart-low-color: #f5c518;
	--globe-chart-high-color: #c41e1e;
	--globe-chart-risk-low-color: var(--globe-chart-low-color);
	--globe-chart-risk-high-color: var(--globe-chart-high-color);
	--globe-chart-land-color: var(--globe-chart-high-color);
	--globe-chart-border-color: rgba(30, 55, 85, 0.4);
	--globe-chart-legend-bg: rgba(255, 255, 255, 0.94);
	--globe-chart-legend-fg: #121826;
	--globe-chart-legend-muted: #5c6b7a;
	--globe-chart-tooltip-bg: var(--globe-chart-legend-bg);
	--globe-chart-tooltip-fg: var(--globe-chart-legend-fg);
	--globe-chart-tooltip-accent: color-mix(in srgb, var(--globe-chart-legend-muted) 35%, transparent);
	--globe-chart-legend-max-height: min(360px, calc(100% - 24px));
	color-scheme: light;
`;

export const darkTokens = css`
	--globe-chart-ocean-color: #0a1e36;
	--globe-chart-empty-color: #16324a;
	--globe-chart-low-color: #f5d04a;
	--globe-chart-high-color: #ff4d4d;
	--globe-chart-risk-low-color: var(--globe-chart-low-color);
	--globe-chart-risk-high-color: var(--globe-chart-high-color);
	--globe-chart-land-color: var(--globe-chart-high-color);
	--globe-chart-border-color: rgba(160, 200, 240, 0.35);
	--globe-chart-legend-bg: rgba(8, 16, 28, 0.94);
	--globe-chart-legend-fg: #e8f0f8;
	--globe-chart-legend-muted: #8aa0b5;
	color-scheme: dark;
`;
```

- [ ] **Step 2: Create `src/ui/styles/host.styles.ts`**

```typescript
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
```

- [ ] **Step 3: Create `src/ui/styles/tooltip.styles.ts`**

```typescript
import { css } from 'lit';

import { glassPanel } from './tokens.js';

export const tooltipStyles = css`
	.float-tooltip-kap {
		position: absolute;
		z-index: 3;
		width: max-content;
		max-width: min(280px, 70%);
		pointer-events: none;
		padding: 0;
		border-radius: 0;
		background: transparent;
		color: var(--globe-chart-legend-fg);
		font-family: var(--globe-chart-font);
		font-size: 13px;
		line-height: 1.3;
	}

	.globe-tip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		box-sizing: border-box;
		padding: 7px 10px;
		border-radius: 8px;
		color: var(--globe-chart-legend-fg);
		font-family: var(--globe-chart-font);
		font-size: 13px;
		line-height: 1.3;
		${glassPanel}
	}

	.globe-tip__swatch {
		flex: 0 0 auto;
		width: 12px;
		height: 12px;
		border-radius: 3px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
	}

	.globe-tip__name {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.globe-tip__value {
		flex: 0 0 auto;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
		color: var(--globe-chart-legend-muted);
	}
`;
```

- [ ] **Step 4: Create `src/ui/styles/legend.styles.ts`**

```typescript
import { css } from 'lit';

import { focusRing, glassPanel, mutedHoverBg } from './tokens.js';

export const legendStyles = css`
	.legend {
		position: absolute;
		top: 12px;
		left: 12px;
		bottom: auto;
		z-index: 2;
		width: min(280px, calc(100% - 24px));
		max-height: var(--globe-chart-legend-max-height);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		font-family: var(--globe-chart-font);
		font-size: 13px;
		color: var(--globe-chart-legend-fg);
		border-radius: 12px;
		animation: legend-fade 280ms ease both;
		${glassPanel}
	}

	@keyframes legend-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	:host([legend-position='right']) .legend,
	:host([legend-position='right']) .legend-toggle {
		left: auto;
		right: 12px;
	}

	.legend-toggle {
		position: absolute;
		top: 12px;
		left: 12px;
		z-index: 2;
		appearance: none;
		border: none;
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 10px 14px;
		border-radius: 999px;
		color: var(--globe-chart-legend-fg);
		animation: legend-fade 280ms ease both;
		${glassPanel}
	}

	.legend-toggle:hover,
	.legend-toggle:focus-visible {
		${mutedHoverBg}
	}

	.legend-header {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex-shrink: 0;
	}

	.legend-header__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.legend-close {
		appearance: none;
		border: none;
		background: transparent;
		cursor: pointer;
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		color: var(--globe-chart-legend-muted);
		padding: 4px 6px;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.legend-close:hover,
	.legend-close:focus-visible {
		color: var(--globe-chart-legend-fg);
		${mutedHoverBg}
	}

	.legend-title {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--globe-chart-legend-muted);
	}

	.legend-subtitle {
		font-size: 12px;
		color: var(--globe-chart-legend-muted);
	}

	.legend-scale {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--globe-chart-legend-muted);
		letter-spacing: 0.02em;
	}

	.legend-scale-bar {
		flex: 1;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--globe-chart-low-color), var(--globe-chart-high-color));
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
	}

	.legend-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.legend-row {
		display: grid;
		grid-template-columns: 12px minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 5px 7px;
		border: none;
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
		text-align: left;
		transition:
			background 160ms ease,
			box-shadow 160ms ease;
	}

	.legend-row:hover,
	.legend-row:focus-visible {
		${mutedHoverBg}
	}

	.legend-row[aria-current='true'] {
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 12%, transparent);
	}

	.legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
	}

	.legend-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.legend-value {
		font-variant-numeric: tabular-nums;
		color: var(--globe-chart-legend-muted);
	}

	.legend-count {
		font-size: 11px;
		color: var(--globe-chart-legend-muted);
		text-align: center;
		flex-shrink: 0;
		padding-top: 4px;
		border-top: 1px solid color-mix(in srgb, var(--globe-chart-legend-muted) 20%, transparent);
	}

	.legend-search {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.legend-search__label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	.legend-search__input {
		width: 100%;
		box-sizing: border-box;
		padding: 7px 9px;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--globe-chart-legend-muted) 35%, transparent);
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 4%, transparent);
		color: var(--globe-chart-legend-fg);
		font: inherit;
		font-size: 12px;
	}

	.legend-search__input:focus-visible {
		${focusRing}
	}

	.legend-search__status,
	.legend-search__error,
	.legend-empty {
		margin: 0;
		font-size: 12px;
		color: var(--globe-chart-legend-muted);
		padding: 6px 2px;
	}

	.legend-search__error {
		color: var(--globe-chart-high-color);
	}

	.legend-pager {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-shrink: 0;
	}

	.legend-pager__btn {
		appearance: none;
		border: 1px solid color-mix(in srgb, var(--globe-chart-legend-muted) 30%, transparent);
		background: transparent;
		color: var(--globe-chart-legend-fg);
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		padding: 5px 9px;
		border-radius: 6px;
		cursor: pointer;
	}

	.legend-pager__btn:hover:not(:disabled),
	.legend-pager__btn:focus-visible:not(:disabled) {
		${mutedHoverBg}
	}

	.legend-pager__btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.legend-pager__meta {
		font-size: 11px;
		color: var(--globe-chart-legend-muted);
		font-variant-numeric: tabular-nums;
	}
`;
```

- [ ] **Step 5: Create `src/ui/styles/toast.styles.ts`**

```typescript
import { css } from 'lit';

import { glassPanel, mutedHoverBg } from './tokens.js';

export const toastStyles = css`
	.toast-stack {
		position: absolute;
		z-index: 5;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: min(340px, calc(100% - 24px));
		pointer-events: none;
	}

	.toast-stack--bottom-end {
		right: 12px;
		bottom: 12px;
	}
	.toast-stack--bottom-start {
		left: 12px;
		bottom: 12px;
	}
	.toast-stack--top-end {
		right: 12px;
		top: 12px;
	}
	.toast-stack--top-start {
		left: 12px;
		top: 12px;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		border-radius: 10px;
		color: var(--globe-chart-legend-fg);
		border-left: 3px solid var(--globe-chart-border-color);
		animation: toast-in 220ms ease both;
		${glassPanel}
	}

	.toast--error {
		border-left-color: var(--globe-chart-high-color);
	}
	.toast--warning {
		border-left-color: var(--globe-chart-low-color);
	}
	.toast--info {
		border-left-color: var(--globe-chart-border-color);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.toast__title {
		display: block;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 2px;
	}

	.toast__text {
		margin: 0;
		font-size: 12px;
		line-height: 1.4;
		color: var(--globe-chart-legend-muted);
	}

	.toast__details {
		margin: 8px 0 0;
		padding: 8px;
		max-height: 120px;
		overflow: auto;
		font-size: 11px;
		line-height: 1.35;
		border-radius: 6px;
		background: color-mix(in srgb, var(--globe-chart-legend-fg) 6%, transparent);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.toast__actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.toast__btn {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--globe-chart-legend-fg);
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
	}

	.toast__btn:hover,
	.toast__btn:focus-visible {
		${mutedHoverBg}
	}

	.toast__btn--dismiss {
		color: var(--globe-chart-legend-muted);
	}
`;
```

- [ ] **Step 6: Create `src/ui/styles/index.ts`**

```typescript
import type { CSSResultGroup } from 'lit';

import { hostStyles } from './host.styles.js';
import { legendStyles } from './legend.styles.js';
import { toastStyles } from './toast.styles.js';
import { tooltipStyles } from './tooltip.styles.js';

export const globeChartStyles: CSSResultGroup = [hostStyles, legendStyles, toastStyles, tooltipStyles];
```

- [ ] **Step 7: Delete the old file and update the import in `globe-chart.ts`**

```bash
git rm src/ui/styles.ts
```

In `src/globe-chart.ts`, change `from './ui/styles.js'` → `from './ui/styles/index.js'`.

- [ ] **Step 8: Typecheck and test**

Run: `npm run typecheck`
Expected: PASS

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Build and visually verify no regression**

Run: `npm run build`
Expected: PASS

Run: `npm run dev:demo` and open the printed local URL. Confirm: legend panel renders with the frosted-glass background, blurred backdrop, and rounded corners; hovering a legend row shows the muted highlight; toggling the legend collapses/expands correctly; toasts (trigger by passing bad data, e.g. temporarily set a row with a non-numeric value) show the same left-accent-bar + glass background as before. Toggle the `theme` attribute between `light`/`dark`/`auto` in the browser devtools and confirm colors switch. Stop the dev server (Ctrl+C) when done.

- [ ] **Step 10: Stop for review**

```bash
git status
git diff --stat
```

---

### Task 12: Trim the public API in `src/index.ts`

**Files:**
- Modify: `src/index.ts` (full rewrite)

**Interfaces:** Public API becomes: `GlobeChart`, `globeChartMockData`, config types + `mergeConfig`/`DEFAULT_CONFIG`/`normalizeCollapseOnSelect`, and the domain/event types consumers need to read `data`/handle events. Internal-only helpers (`buildValueIndex`, `parseDataRows`, `filterLegendEntries`, `mergeLegendByIso`, `paginateItems`, `expandCountryFeatures`, `featuresFromTopology`, `isRecord`, `isDataRow`, `isGeoFeature`, `assertNever`, `definedProps`, `ParseDataRowsResult`, `ValueIndexOptions`, `CountriesTopology`, `SkipReason`, `ToastMessage`, `ValueIndexResult`) are dropped from the public surface (still used internally via direct relative imports — nothing under `src/` imports them through `index.ts`, confirmed by Task 1–11 having wired every internal consumer directly to `./core/...`).

- [ ] **Step 1: Rewrite `src/index.ts`**

```typescript
export { GlobeChart } from './globe-chart.js';
export { globeChartMockData } from './globe-chart.mock-data.js';
export type {
	ColorsConfig,
	GlobeChartConfig,
	GlobeChartConfigInput,
	LegendCollapseMode,
	LegendCollapseOnSelect,
	LegendConfig,
	LegendSearchConfig,
	LegendSearchHit,
	LegendSearchMode,
	ToastsConfig,
} from './core/config.js';
export { DEFAULT_CONFIG, mergeConfig, normalizeCollapseOnSelect } from './core/config.js';
export type {
	CountryEventDetail,
	CountryProperties,
	DataRow,
	FeedbackEventDetail,
	GeoFeature,
	GeoGeometry,
	GlobeChartEventMap,
	LegendEntry,
	LegendSearchEventDetail,
	ThemeColors,
	ToastLevel,
} from './core/types.js';
```

- [ ] **Step 2: Confirm nothing outside `src/` relies on a dropped re-export**

Run: `grep -rn "from '\.\./dist\|globe-chart'" demo stories --include="*.ts" 2>/dev/null; grep -rln "buildValueIndex\|parseDataRows\|filterLegendEntries\|mergeLegendByIso\|paginateItems\|expandCountryFeatures\|featuresFromTopology\b" demo stories 2>/dev/null`
Expected: no output (confirmed in the design phase — `demo/main.ts` and `stories/globe-chart.stories.ts` import `config.js`/`types.js` directly from `src/core/`, not through `index.ts`, and never reference the dropped helpers).

- [ ] **Step 3: Typecheck, test, and full build**

Run: `npm run typecheck`
Expected: PASS

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `npm run build:demo`
Expected: PASS

Run: `npm run build:storybook`
Expected: PASS

- [ ] **Step 4: Stop for review**

```bash
git status
git diff --stat
```

---

### Task 13: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS (both `tsconfig.json` and `tsconfig.typecheck.json` projects).

- [ ] **Step 2: Full test suite with coverage of new files**

Run: `npm test`
Expected: PASS. Confirm the new test files ran: `npx vitest run --reporter=verbose 2>&1 | grep -E "legend-entries|theme-controller|visibility-controller|toast-controller|legend-controller|search-controller"`
Expected: each file listed with passing test counts.

- [ ] **Step 3: Full build matrix**

Run: `npm run build && npm run build:demo && npm run build:storybook`
Expected: all three PASS with no errors.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev` (Storybook) and separately `npm run dev:demo` (Vite demo). In each:
- Confirm the globe renders and the choropleth colors match data.
- Toggle `legend` on and interact with search, paging, and row selection.
- Trigger a warning toast (bad data row) and an error toast (temporarily break the country JSON URL, then revert) — confirm both render and auto-dismiss/persist correctly.
- Switch `theme` between `light`/`dark`/`auto`.
- Toggle `auto-rotate`.

Stop both dev servers when done (Ctrl+C).

- [ ] **Step 5: Report final diff size, no commit**

```bash
git status
git diff --stat
```

Leave the working tree uncommitted — the user will review and commit locally if satisfied.
