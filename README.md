# Movieverse

Movieverse is an interactive cinema atlas. Milestone 0 is a working map of 32 original fictional films, including TV movies. Search by title or year, combine genre and format filters, then select a film on the map or in the accessible result list. Drag, pinch, scroll, or use the map buttons and arrow keys. Colors indicate primary genre. Positions are for navigation.

## Run locally

Install Python 3.12+, Node.js 24+ and pnpm 11.25.0 (for example, `npm install -g pnpm@11.25.0`). From the repository root:

```sh
python -m pipeline.src.catalog
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL Vite prints (normally http://localhost:5173). Regeneration is optional on a clean checkout because the generated sample is tracked.

## Verify

From the repository root:

```sh
python -m unittest discover -s pipeline/tests -v
cd web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Linux may require `pnpm exec playwright install --with-deps chromium`. Use `pnpm preview` for local inspection of the build in `web/dist`.

See the [brief](MOVIEVERSE_CODEX_BRIEF.md), [product scope](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [source review](docs/DATA_SOURCES.md), [data model](docs/DATA_MODEL.md), [projection](docs/SIMILARITY.md), and [decisions](docs/DECISIONS.md). Next, audit a small, stratified sample of Wikidata film records, including television and international titles, before targeting a larger release.
