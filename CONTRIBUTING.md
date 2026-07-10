# Contributing

Thanks for interest in globe-chart.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev          # Storybook
npm run dev:demo     # local demo site
```

Country GeoJSON is packed under `src/data/`. To rebuild from a full Natural Earth
file: `npm run slim-geo -- path/to/full.geojson`.

## Guidelines

- Keep the Lit shell thin; put logic in focused modules under `src/`.
- Prefer configurable defaults over hard-coded product copy.
- Keep Natural Earth attribution in `NOTICE` and the README.
- Keep commit messages and docs professional and product-focused.

## Releases

Bump the version, push a tag, and publish a GitHub Release. CI publishes to npm
via OIDC (see `.github/workflows/publish-npm.yml`).

## License

Open-source contributions are accepted under the MIT License. Proprietary use of
the package still requires approval per `COMMERCIAL.md`.
