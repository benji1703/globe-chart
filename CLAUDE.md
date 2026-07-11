# globe-chart — agent notes

Framework-agnostic `<globe-chart>` Lit web component: country choropleths on a
3D globe (globe.gl / three.js). Published on npm; demo auto-deploys to GitHub
Pages (https://benji1703.github.io/globe-chart/) on every push to `main`.

## Commands

- `npm test` — vitest (jsdom), all unit tests
- `npm run typecheck` — src + typecheck configs, both must pass
- `npm run build` — library ES bundle → `dist/` (+ d.ts, + countries JSON copy)
- `npm run build:demo` / `npm run dev:demo` — demo site (port 5173)
- `npm run build:storybook` / `npm run dev` — storybook (port 6006)
- `npm run slim-geo` — regenerate slimmed Natural Earth topology

## Architecture (src/)

- `globe-chart.ts` — the Lit component; wires everything, owns init lifecycle
- `core/` — pure logic, no DOM/three: config resolution, value-index,
  color-scale, legend-entries/query, iso, format, toast model
- `controllers/` — Lit ReactiveControllers: theme, visibility, toast, legend
  (selection/paging/collapse), search (debounce/abort/provider)
- `scene/` — three/globe.gl side: `globe-scene.ts` (renderer lifecycle,
  idle-pause), `choropleth-layer.ts` (polygon paint), `materials.ts` (caches)
- `ui/` — legend-view, toast-view, `styles/` (tokens + per-part styles)
- `load-countries.ts` — TopoJSON fetch; asset path built from opaque string
  parts ON PURPOSE so Vite neither inlines a data: URL nor emits a duplicate
  hashed asset. Countries JSON must sit beside the emitted JS (dist/,
  demo/dist/assets/, storybook-static/assets/ — each build has a copy step).
- `stubs/` (repo root, published as `globe-chart/stubs/*`) — build-time
  stand-ins for `three/webgpu`, `three/tsl`, `h3-js`.

Only globe.gl's **polygons layer** is used. Everything else in three-globe is
dead weight for this component.

## Hard-won gotchas (do not re-learn these)

1. **three-globe statically imports `three/webgpu` + `three/tsl` + `h3-js`**
   (heatmap GPU-compute and hexbin layers we never use). Unstubbed this adds
   ~250 kB gzip. demo/vite.config.ts and .storybook/main.ts alias them to
   `stubs/`; README "Shrink your bundle" documents the consumer recipe. When
   upgrading globe.gl/three-globe, re-check the destructured import names in
   three-globe.mjs and keep stub exports in sync — build warning
   "Import X will always be undefined" means a stub export is missing.
2. **three-globe's destructor disposes materials it does not own**
   (`polygonsData([])` → `_deallocate` → `material.dispose()` on our cap
   materials). Any cached three.js resource handed to a globe.gl accessor MUST
   self-evict on its `dispose` event (see `landCapMaterial`), or the next
   component instance gets dead materials → blank country caps until full
   reload (Storybook story switch, SPA remount). Regression test:
   `src/scene/materials.test.ts`.
3. **Cold-start / jank policy** in `globe-scene.ts` + `createGlobe()`:
   `scheduler.yield` before importing globe.gl, scene create + countries fetch
   run in parallel, first polygon paint uses transition 0 (animated morph =
   long task), pointer raycasts enabled only after first paint, rAF loop
   idle-pauses (globe.gl otherwise runs rAF forever), DPR capped at
   `config.globe.maxPixelRatio` (default 1), antialias off, low-power GPU
   hint. Don't "fix" the paused animation loop — it's intentional.
4. **Demo loading is parallelized at build time**: a vite plugin injects
   `modulepreload` for the globe.gl/three.core/globe-chart chunks and a
   `preload as=fetch` for the countries JSON into demo/dist/index.html. Don't
   add static preload links to demo/index.html source — hashes change.
5. **Headless Chrome visual checks need a real GPU backend**:
   `--use-angle=metal`. SwiftShader renders an empty globe canvas even on
   known-good builds. Repro pattern for remount bugs: puppeteer-core +
   system Chrome against the storybook manager, click sidebar story links
   (same-page remount — loading iframe.html directly is a full reload and
   won't reproduce module-state bugs).

## Release process

Manual: bump `package.json` version (+ `npm install --package-lock-only`),
run test+typecheck+build, commit `main`, push, tag `vX.Y.Z`, then
`gh release create vX.Y.Z` — the **GitHub release** triggers
`publish-npm.yml` (npm publish with provenance). Pages deploys on push
automatically. npm versions are immutable — never reuse a published version.
Repo owner GitHub identity: benji1703 (gh CLI). Never commit `.omc/` or
`storybook-static/` (gitignored scratch/artifacts).

## Publishing contract

- Library externalizes `lit`, `globe.gl`, `three`, `topojson-client`
  (vite.config.ts rollup externals) — consumers bundle them.
- `package.json` `files`: dist, stubs, LICENSE, COMMERCIAL.md, NOTICE, README.
- Exports: `.` (dist/globe-chart.js + types) and `./stubs/*`.
- Public API surface is deliberately small (index.ts) — don't re-export
  internal utilities.
