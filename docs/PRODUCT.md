# Product and scope

Movieverse is a free atlas for discovering cinema through an explorable landscape. The intended catalog includes international, independent, animated, documentary, streaming, direct-to-video, theatrical, and made-for-TV films. Series and individual episodes remain outside launch scope. Classification and distribution are separate concepts.

Milestone 0 ships an anonymous static prototype with touch and keyboard navigation, genre and format filters, title/year search, point selection, a responsive details card, and an accessible film list. A mobile in-flow card keeps the map mounted. Draggable sheets, related-film suggestions, deeper filters, and live film facts await later iterations.

1. Audit and grow a real film catalog with credible provenance, identity resolution, and measured map quality. The current 255-film pilot exports from build-time SQLite. [Benchmarks](PERFORMANCE.md) cover denser map rendering and paged search results. Next, measure on physical phones and investigate loading and spatial indexing before a substantially larger release. The brief's 10k–50k range depends on source coverage, quality, and performance.
2. Add browser-only personal constellations from user-authorized Letterboxd exports after verifying actual files.
3. Validate multiple similarity lenses and interpretable film connections.
4. Expand catalog and rendering capacity only when rights, quality, and benchmarks support it.
5. Explore moderated corrections, optional accounts, and authorized integrations separately.
