# Architecture

A Python source adapter emits normalized films. A projection consumes those films and emits geometry keyed by the same IDs. The build stages copy compact JSON artifacts into a static Vite build. React owns the catalog, filters, selection and semantic list. AtlasMap owns Canvas 2D drawing and input, with camera math in an independent module. It draws in animation frames, caps device pixel ratio at two, culls offscreen markers, and reveals nonoverlapping labels at higher zoom.

The v1 manifest names a catalog and a geometry asset, documents schema/projection versions and includes a content revision. The client checks schema, projection, count, and the ID join. The small sample loads as a unit and uses a linear scan. For live releases, publish immutable revision paths and activate the manifest after assets are available. For large maps, choose spatial tiles/aggregates by zoom, build a compact search index separately, virtualize result rows, and fetch details by ID. Profile Canvas versus WebGL before changing the renderer. Hundreds of thousands of films are an architecture target and have not been benchmarked.

Tentative scale benchmarks should record compressed transfer, time to interactive map, frame time on a low-end phone, and worker search latency across 10k/50k/250k representative points. Initial targets to validate are 500 KiB compressed for the initial atlas payload and a 95th percentile frame time under 32 ms during gestures on the selected phone.

Alternative projections can share the catalog and result selection. Future personal overlays join by Movieverse ID and can be parsed in a worker and stored in IndexedDB. Keep public artifacts independently reproducible.

GitHub Pages is the proposed static host. Vite uses relative base URLs for repository paths. Build and serve `web/dist` when deployment is approved. The repository workflow only verifies changes.
