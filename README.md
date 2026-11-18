# Movieverse

Movieverse is an interactive cinema atlas. The Wikidata pilot includes 135 films. Search by title, alternate title, or year, combine country, genre, and format filters, and select a film to see its metadata and source. The map shows editorial genre groups. See the [pilot audit](docs/WIKIDATA_PILOT.md) for coverage and limitations.

## Open in VS Code

Open the local Movieverse checkout in VS Code. Right-click the [index.html at the repository root](index.html) and choose **Open in Integrated Browser**. It opens the interactive demo without a terminal, dependency install, or server.

The root file is generated from the same React app and sample data. It reflects the latest checked-in build. Use the development server below for live edits. After changing the app or sample data, run `pnpm build:standalone` from `web/` to refresh the root file.

## Develop locally

Open the Movieverse repository folder in VS Code and open its integrated terminal. Install Node.js 24+ and pnpm 11.25.0 (for example, `npm install -g pnpm@11.25.0`), then run:

```sh
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL Vite prints (normally http://localhost:5173). Opening `web/index.html` directly or through a generic HTML preview bypasses the TypeScript build. Keep the Vite terminal running while you use the atlas.

Install dependencies before inspecting TypeScript diagnostics. If VS Code still reports missing packages after installation, run **TypeScript: Restart TS Server** from the Command Palette. You can check the project directly with `pnpm typecheck` from `web`.

The sample data is tracked, so Python is optional for using the app. Run `python -m pipeline.src.pilot` from the repository root with Python 3.12+ to build a local SQLite database from pinned evidence and export the static atlas. See the [data README](data/README.md) for inspecting the database, refreshing the evidence, and generating the original fixture catalog.

## Verify

From the repository root:

```sh
python -m unittest discover -s pipeline/tests -v
cd web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:standalone --check
pnpm exec playwright install chromium
pnpm test:e2e
```

Linux may require `pnpm exec playwright install --with-deps chromium`. Use `pnpm preview` for local inspection of the build in `web/dist`.

See the [brief](MOVIEVERSE_CODEX_BRIEF.md), [product scope](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [source review](docs/DATA_SOURCES.md), [data model](docs/DATA_MODEL.md), [projection](docs/SIMILARITY.md), and [decisions](docs/DECISIONS.md).
