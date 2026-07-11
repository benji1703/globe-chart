# globe-chart internal rewrite — design

Status: approved by user 2026-07-10. Not committed (working-tree only per user request).

## Problem

`src/globe-chart.ts` (945 lines) is a god component: camera control, legend
paging/search/collapse, toast/notification, theme resolution, visibility
observing, and config merging all live as ~20 `@state` fields and private
methods on one `LitElement`. This violates SRP and makes each concern
untestable in isolation. Secondary issues:

- `src/ui/styles.ts` (558 lines) repeats the same glass-panel / shadow /
  `color-mix` pattern across legend, toast, tooltip, and toggle rules.
- `src/index.ts` publicly re-exports internal implementation helpers
  (`buildValueIndex`, `parseDataRows`, `filterLegendEntries`,
  `mergeLegendByIso`, `paginateItems`, `expandCountryFeatures`,
  `featuresFromTopology`, `isRecord`/`isDataRow`/`isGeoFeature`/
  `assertNever`/`definedProps`) that nothing outside the component consumes
  (verified via grep — each is used only by its own definition file + the
  `index.ts` re-export + `globe-chart.ts`).

Note: the codebase is **already strictly typed** (strict TS, no `any`,
exhaustive union checks via `assertNever`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`) — this rewrite is a SOLID/SRP decomposition and
API-surface trim, not a typing fix.

## Non-goals (YAGNI)

- Build tooling (Vite/vitest/tsconfig) is unchanged — already 2026-appropriate
  (strict mode, `Bundler` resolution, ES2022 target, correct externals).
- `scene/globe-scene.ts`, `layer/choropleth-layer.ts`, `materials.ts`,
  `color-scale.ts`, `value-index.ts`, `iso.ts`, `legend-query.ts` keep their
  current logic — they're already small and single-purpose. They move for
  organization only.
- Element attributes/properties/events/config *shape* stay identical. No
  attribute renames — the current surface is clean and already used by the
  demo and Storybook stories.

## Target module layout

```
src/
  core/                          pure logic, no Lit/DOM-event coupling
    types.ts  config.ts  color-scale.ts  value-index.ts
    legend-query.ts  iso.ts  format.ts
  controllers/                   Lit ReactiveControllers, one per concern
    theme-controller.ts
    visibility-controller.ts
    legend-controller.ts
    search-controller.ts
    toast-controller.ts
  scene/                         three.js / globe.gl integration (unchanged)
    globe-scene.ts  choropleth-layer.ts  materials.ts
  ui/
    legend-view.ts  toast-view.ts          pure render functions
    styles/
      tokens.ts                            shared css mixins (glass, focus-ring, muted-text)
      host.styles.ts  legend.styles.ts  toast.styles.ts  tooltip.styles.ts
      index.ts                             combines into styles array
  globe-chart.ts                 thin host: owns controller instances, wires render()
  index.ts                       trimmed public API
  globe-chart.mock-data.ts
  yield-main.ts
  data/ne_110m_admin_0_countries.json
```

## Controllers

Each controller is a **class implementing Lit's `ReactiveController`**
(`hostConnected` / `hostDisconnected` / `hostUpdate` as needed), constructed
with a typed options interface, exposing readonly getters for its state and
explicit methods for mutation — no loose object literals standing in for
behavior. Each is constructible with a minimal fake `ReactiveControllerHost`
in tests, independent of mounting the full custom element.

- **ThemeController** — resolves `ThemeColors` from CSS custom properties +
  config; owns the `prefers-color-scheme` `MediaQueryList` listener. Replaces
  `resolveThemeColors` + `colorSchemeMq` wiring.
- **VisibilityController** — wraps `IntersectionObserver`; exposes `visible`
  getter and an `onVisible` callback hook. Replaces `observeVisibility`.
- **LegendController** — owns `selectedIso`, `legendPage`, `legendExpanded`,
  the `legendEntries` / `filteredLegendEntries` computations, `jumpTo`,
  collapse-on-select logic, and the mobile-breakpoint `MediaQueryList`.
- **SearchController** — owns `legendQuery`, debounce timer, remote provider
  invocation + `AbortController`, `legendSearching`/`legendSearchError`.
  Collaborates with `LegendController` (feeds it remote hits) rather than
  duplicating entry-merging logic.
- **ToastController** — wraps `toast.ts`'s reducer, per-toast dismiss timers,
  and the `notify()` → `error`/`warning` `CustomEvent` dispatch.

`GlobeScene` (three.js/globe.gl wrapper) and `ChoroplethLayer` stay as plain
classes (not `ReactiveController`s) — they're imperative WebGL drivers, not
Lit-reactive state, and are already correctly scoped.

## CSS

`ui/styles/tokens.ts` extracts repeated patterns (glass-panel background +
backdrop-filter + box-shadow, focus-visible outline, muted-text color) as
composable `css` snippets consumed via template interpolation. Each UI
region (`host`, `legend`, `toast`, `tooltip`) gets its own file *co-located
conceptually* with its render module. `globeChartStyles` becomes an array
(`static styles = [hostStyles, legendStyles, toastStyles, tooltipStyles]`,
natively supported by Lit) assembled in `ui/styles/index.ts`. Same rendered
CSS, no visual change — just deduplicated source and per-region files.

## Public API (`index.ts`)

Keep: `GlobeChart`, config types + `mergeConfig`/`DEFAULT_CONFIG`/
`normalizeCollapseOnSelect`, domain types (`DataRow`, `GeoFeature`,
`CountryProperties`, `GlobeChartEventMap`, event-detail types), `ThemeColors`,
`LegendEntry`, `globeChartMockData`.

Drop the re-export of: `buildValueIndex`, `parseDataRows`,
`filterLegendEntries`, `mergeLegendByIso`, `paginateItems`,
`expandCountryFeatures`, `featuresFromTopology`, `isRecord`, `isDataRow`,
`isGeoFeature`, `assertNever`, `definedProps`. These remain internal to
`src/core/` and `src/globe-chart.ts`.

## Testing

- New `*.test.ts` per controller (`theme-controller.test.ts`,
  `visibility-controller.test.ts`, `legend-controller.test.ts`,
  `search-controller.test.ts`, `toast-controller.test.ts`) — construct with a
  minimal fake host, assert state transitions directly, no DOM mounting.
- `src/globe-chart.test.ts` stays as the integration suite (mounts the real
  `<globe-chart>`), updated only where it currently reaches into internals
  that move (e.g. accessing `scene.globe` directly is unaffected — `scene`
  stays a direct property of the host).
- `src/core.test.ts` unchanged — it tests pure `core/` functions.

## Execution approach

Work happens directly in the working tree (git status was clean at start of
this task) — no branch, no commits. User runs `npm run test` /
`npm run typecheck` / `npm run dev` / `npm run dev:demo` locally to verify
before deciding whether to commit.

Phased so `test`/`typecheck`/`build` stay green after each phase:

1. Extract `ThemeController` and `VisibilityController` (smallest, least
   coupled) out of `globe-chart.ts`; host delegates to them.
2. Extract `ToastController`.
3. Extract `SearchController` + `LegendController` together (tightly
   coupled — search feeds legend's filtered view).
4. Move `core/` pure modules and `scene/`/`ui/` files into the new layout;
   update imports.
5. Split `ui/styles.ts` into `ui/styles/*` with the `tokens.ts` mixin layer.
6. Trim `index.ts` to the reduced public API.
7. Add controller unit tests.
8. Full verification pass: `npm run typecheck`, `npm test`, `npm run build`,
   `npm run build:demo`, `npm run build:storybook`.
