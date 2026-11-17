# Movieverse
## Product vision, architecture, roadmap, and Codex implementation brief

**Project:** Movieverse  
**Repository:** `Movieverse`  
**Status:** New project; no implementation assumed  
**Project type:** Free, public, mobile-first interactive movie exploration website  
**Working product name:** Movieverse (the earlier name “Cinema Atlas” was a concept, not a required final name)

> **Instructions for Codex:** Treat this document as the product brief and initial implementation contract. Do not attempt to build every future feature at once. Inspect the repository first; preserve any existing work. Begin with a narrow, functional, tested first vertical slice. Ask only when genuinely blocked by a consequential ambiguity. Document assumptions, source licenses, architectural choices, and unfinished work.

---

## 1. Executive summary

Build **Movieverse**, an interactive, explorable map of cinema inspired by https://mikeyguinness.com/movies/. Movies appear as points in a meaningful 2D landscape: films with shared characteristics tend to cluster together. Users can pan, zoom, search, filter, select films, and discover related films. The experience should feel like navigating a cinematic star atlas, not browsing a spreadsheet.

Our ambition is to **meaningfully improve upon the reference** with a mobile-first interface, rich desktop exploration, clearer navigation, trustworthy similarity, explainable connections, high-quality data provenance, personal movie constellations, and eventually a substantially larger global catalog.

**Core philosophy:** Accuracy and usability come before quantity. Ten thousand convincingly placed films are better than a quarter-million arbitrarily positioned dots.

Movieverse is the **first independent interactive data project** in a future portfolio of separately deployed data experiences. Do **not** build that overarching portfolio now. Build Movieverse as a standalone, cleanly maintained repository and website.

## 2. Product principles and confirmed decisions

1. **Free for everyone.** Public exploration never requires an account. A voluntary Buy Me a Coffee button may be added **only after** checking compatibility with the licenses and terms of all included data/assets/services. Free access and voluntary donations are not automatically synonymous with “noncommercial” under third-party terms.
2. **Accuracy first, scale second.** Start with a limited, high-quality dataset; expand based on data coverage, confidence, performance testing, and rights review. Long-term aspiration: 250,000+ films, if actually supportable. This is not an MVP acceptance criterion.
3. **Global, inclusive movie catalog.** Include theatrical features, **made-for-TV movies** (e.g., *Nick Fury: Agent of S.H.I.E.L.D.* (1998)), streaming originals, direct-to-video features, documentaries, animated features, independent and international films, and films from all periods. TV series and individual TV episodes are **out of scope** at launch. Short films are a possible later addition. Distribution channel must not determine whether something is a film.
4. **Mobile-first, desktop-expansive.** Touch-first exploration on small screens; more simultaneous controls, panes, and advanced tooling on desktop. One coherent responsive product, not two separate applications.
5. **Dark, cinematic, astronomical visual identity.** Use color to encode meaningful information, not decoration alone. Accessible contrast and legibility matter more than flashy effects.
6. **No required authentication in the MVP.** Eventually consider optional registered accounts, cloud sync, collections, social features, and moderated movie submissions. Only design extension seams now.
7. **Privacy-conscious personal data.** Plan for user-authorized Letterboxd ZIP/CSV exports processed locally in-browser, without requiring password submission or uploading personal archives to our server. Official automatic account sync is future-only and contingent on approved API access.
8. **Evidence-based metadata.** Keep sources, IDs, provenance, rights, last-checked timestamps, confidence/verification status, and merge decisions. Do not invent movie details.
9. **Deployable and maintainable.** Prefer a static-first production app with precomputed map geometry and search indices; do not introduce a persistent backend unless it becomes necessary.

## 3. Desired visitor experiences

### A. Explore the universe
- Open a fast-loading, immersive movie map.
- Pan smoothly, pinch/wheel to zoom, and jump between labeled regions.
- At far zoom, see broad regions/aggregated clusters; at near zoom, see film-level details and labels selectively.
- Search by title and disambiguate similar titles using year and other known metadata; fly to a result.
- Filter by year/range, genres, country, language, runtime, and other dimensions **only when the dataset reliably supports them**. Explicitly distinguish unknown values from negative values.
- Select a movie to see a panel/sheet with available details and nearby related movies.

### B. Understand similarity (later milestone)
- Explain *why* two films are near one another in human-readable terms (shared genres, subjects, creators, era, etc.) when supportable by underlying data.
- Offer **Similarity Lenses**, potentially including Theme, Genre, People, and Era. Treat these as distinct, precomputed or validated projections rather than arbitrary cosmetic recoloring.
- Select two movies to trace an **explainable movie-to-movie connection path**, traveling through meaningfully related films. Do not claim a mathematically shortest path unless it really is one under a documented graph/weighting definition.

### C. Personal constellations (post-MVP milestone)
- Import an official Letterboxd account export ZIP/CSV. Parse watched films, diary records, ratings, and watchlist fields **according to verified formats**.
- Match imported films to canonical Movieverse IDs. Use stable IDs when present, then conservative title/year/alias matching with a review queue for ambiguous matches. Never merge identities by title alone.
- Keep movie locations in the shared global universe while highlighting a user’s watched movies and watchlist as overlays.
- Show a rating heatmap, unexplored regions, interesting nearby unwatched films, and ability to isolate a constellation.
- Start with browser-only local persistence (e.g., IndexedDB), clear import/delete controls, and no server-side collection of Letterboxd data.
- Future: authorized live sync if formally approved; optional Trakt integration after terms review; compare opt-in user constellations; account-based features after the public site works.

### D. Community improvement (future)
- Authenticated users can **submit** missing films or corrections with evidence links.
- Run automated duplicate and schema checks, then human moderation before publication.
- Maintain editorial audit trails, provenance, abuse prevention, and a reproducible process to add accepted films to subsequent map releases.
- User submissions must not bypass rights review or ingest unlicensed synopses/posters.

## 4. Data strategy and source/legal gates

**Do not begin by indiscriminately scraping encyclopedias or collecting every possible title.** Begin with an auditable data-source assessment and a small, reproducible pipeline.

Candidate sources to evaluate:

| Source | Intended role | Caution / action |
|---|---|---|
| **Wikidata** | Primary candidate for canonical movie identities and structured facts | Confirm current dump/API/SPARQL access practices; structured data is generally CC0. Retain QIDs and statement provenance. |
| **Wikipedia** | Supplementary verification, titles/aliases, references, possibly additional factual fields | Wikipedia article text has attribution/share-alike obligations. Do not freely copy synopses or assume all images are reusable. Prefer official APIs/dumps and factual extraction. |
| **Wikimedia Commons** | Possible licensed images | Verify each asset's actual license, attribution, and terms; do not assume all files share one license. |
| **TMDB** | Rich metadata, posters, credits, keywords, possible cross-references | Verify up-to-date API terms, attribution, caching/storage, ML/embedding restrictions, and whether donations change commercial classification. **Do not integrate by default until permitted use is established.** |
| **Open Film Database (OFDb)** | Supplemental metadata | Investigate coverage, identifiers, ODbL obligations, and compatibility with the intended public database. |
| **Cadrame** | Emerging open metadata option | Evaluate maturity, accuracy, IDs, and current license. |
| **MovieLens** | Research into ratings-based similarity | Dataset-use limits may rule out public redistribution/commercially ambiguous use; do not ingest until cleared. |
| **Trakt** | Future authorized personal library integration | Review present API/access terms prior to implementing. |
| **Letterboxd** | Personal account exports first; possible approved API in future | Do not rely on unauthorized scraping or assume official API approval. Verify export shape and current API terms. |
| **Grokipedia** | Potential manual research lead only | Do **not** automate crawling or import content unless terms/license and permission allow it. Independently verify claims. |
| **IMDb** | Potential ID cross-reference only where legally available | Do not build a public redistributed catalog from restrictive downloadable datasets without the necessary rights. |

**Codex must create** `docs/DATA_SOURCES.md` with a dated review of sources, licenses, data fields, access methods, restrictions, attribution requirements, unknowns, and a clear `approved / deferred / blocked` decision. Verify current primary sources instead of treating this brief as legal advice. If internet access is unavailable, mark findings as **unverified** and implement against a small permitted fixture; do not bluff verification.

Maintain a clear boundary between:
- **Public-domain/CC0-like factual structured records** used as a reliable open core;
- licensed or attributed text/images used only in accordance with their terms;
- user-supplied private data, kept separate from public movie records.

Avoid storing copyrighted descriptions copied from articles by default. Use references and metadata, and display licensed media only with correct rights/attribution. Never commit API keys, personal data exports, or large raw external dumps.

## 5. Canonical movie model and provenance

Design data structures that permit expansion without a rewrite. A reasonable starting shape is:

- `movie_id`: durable Movieverse internal ID
- `external_ids`: Wikidata QID and other verified IDs (not every source ID must be public)
- `primary_title`, `alternate_titles`, `original_title` where known
- `release_date` and/or `release_year` with precision/uncertainty noted
- `movie_type` (feature, TV movie, documentary, animation or appropriate multiple independent classifications; do not falsely model mutually exclusive dimensions)
- `distribution_type` (theatrical, television, streaming, direct-to-video, unknown; possibly multiple)
- `genres`, `subjects/themes`, `countries`, `languages`, `runtime_minutes`
- `people/credits` with known roles, verified identifiers, and uncertainty
- optional `synopsis`, `poster`, `ratings` **only with explicit rights and source information**
- per-field provenance or equivalent source evidence and retrieval timestamps
- `identity_confidence`, `metadata_completeness`, `verification_status`
- map coordinates and clusters in **versioned, separate derived artifacts**, not primary movie identity records

**Model identity carefully.** Different movies can share title and year. Films may be remakes, retitled releases, documentaries about another film, or reissues. Preserve conflicts/unknowns rather than silently overwriting them. Source-specific IDs and clear merge rules are essential.

## 6. Similarity model: meaningful before impressive

The original site uses high-dimensional metadata representation and dimensionality reduction. Movieverse should create its **own** reproducible and documented data transformation, not copy another site's proprietary dataset or derived coordinates.

For early versions:
1. Identify trustworthy, sufficiently populated film features.
2. Encode useful features with reasonable normalization/weights (e.g., genre, subject, language, country, creator, release era). Avoid overstating thematic similarity when only generic structured tags are present.
3. Calculate similarity with explicit handling of missing values and metadata sparsity. Do not interpret `unknown` as `not present`.
4. Produce a deterministic or seeded nearest-neighbor set, a 2D layout (UMAP or a simpler defensible baseline), and clusters where justified.
5. Export compact **versioned** artifacts containing public film labels/IDs, coordinates, cluster affiliation, and searchable metadata, with a reproducible script and quality diagnostics.
6. Define confidence and diagnostics: coverage, duplicate rate, data completeness, neighbor sanity checks, cluster interpretability, and known weak points.
7. Validate results manually on a small curated set, including made-for-TV and international films.

**A 2D projection is only a navigation aid:** neighbors on the screen do not automatically prove meaningful similarity. Keep computed nearest neighbors and feature-based explanations separate from screen-space distance. Version the projection so adding new films doesn't unpredictably shift the entire map without warning.

For the first UI vertical slice, a **small real-data or clearly identified fixture dataset** is acceptable. Do not invent 'production' film facts to fake thousands of titles.

## 7. Recommended implementation stack

Use these as defaults, adjusting only when you can justify a better fit in the repository:

- **Web:** React, TypeScript, Vite.
- **Visual rendering:** A canvas/WebGL approach, evaluating PixiJS for scalable rendering; avoid putting tens of thousands of interactive DOM nodes or labels on screen. Abstract renderer implementation so we can switch strategy if profiling warrants.
- **Styling:** clean responsive CSS/tokens with accessibility built in; an extra UI framework is optional, not required.
- **Data pipeline:** Python, with typed/model-validated transformations where practical; Pandas/Polars and scikit-learn/UMAP/HDBSCAN as justified by data size and diagnostics, not merely because they are fashionable.
- **Build/output:** static precalculated JSON or binary/columnar spatial data, compression and/or spatial tiles when needed.
- **Persistence for personal overlays later:** local IndexedDB; no backend for MVP.
- **Hosting:** static deploy to GitHub Pages or Cloudflare Pages; document the chosen deployment approach.
- **Quality:** unit tests for data processing and identity matching, frontend tests for search/filter behavior, a basic end-to-end interaction test, lint/typecheck/format and CI.

**Proposed organization** (adapt if repository already contains a structure):

```text
Movieverse/
├── README.md
├── AGENTS.md                     # Codex instructions specific to this repo
├── docs/
│   ├── PRODUCT.md               # Product scope and feature roadmap
│   ├── ARCHITECTURE.md          # Stack, systems, artifact format
│   ├── DATA_SOURCES.md          # Licensing and provenance matrix
│   ├── DATA_MODEL.md            # Canonical IDs/fields/merge policy
│   ├── SIMILARITY.md            # Model decisions and diagnostics
│   └── DECISIONS.md             # Short decision records
├── web/                          # React + TypeScript + Vite app
│   ├── src/
│   └── public/
├── pipeline/                     # Python ingestion/normalization/layout
│   ├── src/
│   ├── tests/
│   └── fixtures/
├── data/
│   ├── README.md                # Sources and regeneration guidance
│   └── sample/                  # Small safe-to-distribute output only
└── .github/workflows/
```

Do not add heavyweight infrastructure, microservices, cloud databases, authentication vendors, or a complicated monorepo framework without a demonstrated need.

## 8. UX and accessibility requirements

### Mobile first
- Map fills the available viewport; account for safe-area insets and mobile browser chrome.
- Touch pan and pinch zoom; useful one-finger gestures where feasible and controls that do not rely solely on gestures.
- A draggable, dismissible bottom sheet for movie info, search and filters.
- Large enough touch targets, readable film labels, predictable back/close controls, and accessible focus management.
- Preserve map state when opening a film and returning to exploration.

### Desktop expansion
- Persistent left-side search/filters where appropriate, expansive central canvas, optional right-side film details panel.
- Keyboard shortcuts, zoom controls, optional minimap, richer compare tools.
- Avoid clutter and prevent panels from consuming the central exploration surface unnecessarily.

### General
- Consider reduced-motion preference, keyboard-only access, semantic controls, screen-reader alternatives to nonsemantic points on a canvas, clear loading/error/empty states, and color-blind accessibility.
- Progressive reveal by zoom level; never render an unreadable wall of overlapping labels.
- Give users a legend, context clues, and a concise explanation of what positions and colors do (and do not) mean.
- On slower phones, prioritize smooth interaction and memory limits over particle effects.

## 9. Performance requirements

Architecture should anticipate tens of thousands of films, then potentially 250k+, without promising those volumes at launch.

- Precompute heavy data transforms outside the browser.
- Use viewport culling/spatial indexing and zoom-dependent aggregation/level of detail.
- Avoid network transfer of the entire future corpus if a spatial/chunked layout can prevent it.
- Do not instantiate a React component per map point.
- Use a background worker for CPU-heavy search or future ZIP import when appropriate.
- Establish reproducible performance budgets/benchmarks for low-end mobile and common desktop sizes.
- Profile before switching renderers or introducing elaborate optimizations.

## 10. Feature roadmap and scope gates

### Milestone 0: Foundation / first Codex task
**Goal:** A runnable, reproducible skeleton, an honest data plan, and one working vertical slice.

Deliverables:
1. Inspect repository and existing environment, then write a concise plan with assumptions.
2. Create the proposed docs (`PRODUCT`, `ARCHITECTURE`, `DATA_SOURCES`, `DATA_MODEL`, `SIMILARITY`, `DECISIONS`) and an `AGENTS.md` that reflects this brief.
3. Scaffold React/TypeScript/Vite and Python project with basic tests, lint/typecheck instructions, reproducible commands, and `.gitignore`.
4. Build a **minimal, legal, auditable sample data pipeline**: use available open/approved sources if feasible, otherwise small properly labeled fixtures while creating interfaces for future Wikidata ingestion. Do not fake license clearance.
5. Create a responsive dark-theme interactive prototype featuring a canvas map, pan/zoom (including touch), selectable movie points, visible movie details, search, and at least one functional filter. A small fixture dataset is acceptable for the UI prototype.
6. Data pipeline should output versioned compact artifacts with canonical IDs and a reproducible command to generate them.
7. Add startup instructions, tests, limitations, and a short next-step recommendation. Confirm `build`, tests, and typecheck actually pass, or explicitly report blockers.

**Definition of done:** A developer can clone the repository, run a clearly documented setup command and launch a usable interactive prototype locally. Its test commands run, the data used is identified, and scope/limits are not disguised.

### Milestone 1: Trustworthy 10k–50k film catalog
Audit and ingest adequately described film records; implement robust dedup and ID mapping, quantitative completeness audits, improved layout, known cluster labels, full search/filter coverage, citations/source metadata, and measured mobile performance. The range is an aspiration contingent on actual source availability and quality.

### Milestone 2: Personal constellations
Official Letterboxd export ZIP/CSV import; local-only parsing/storage; record matching; watched/watchlist/rating overlays; clear/import/export/delete data controls.

### Milestone 3: Discovery sophistication
Human-readable similarity explanations, richer film panels, genre/era/people/theme lenses after validation, explainable movie connection paths, personal unexplored-region recommendations, bookmarks.

### Milestone 4: Large-scale expansion
Scale spatial artifacts and search to 100k and potentially 250k+ movies based on rights/data quality and benchmark performance; incremental update process, validated provenance, better automated diagnostics.

### Milestone 5: Optional community and social features
Optional authentication, moderated submissions/corrections, optional account sync and opt-in social comparison, privacy/security assessment, donation option if source terms allow.

## 11. Non-goals for the initial sprint

- No production user accounts, passwords, or paid tiers.
- No server-side Letterboxd scraping or unauthorized OAuth usage.
- No indiscriminate crawling of Wikipedia, Grokipedia, Letterboxd, or IMDb.
- No requirement to integrate TMDB before rights and terms are reviewed.
- No claims that 250k films are immediately available or accurately placeable.
- No fake reviews/ratings, copied movie posters, or unlicensed article synopses.
- No real-time global recomputation of the 2D movie map in visitors' browsers.
- No attempt to ship every proposed mode or community feature in one PR.
- No overengineered backend or dependency stack.

## 12. How Codex should work

1. **Start with repository inspection.** If empty, scaffold cleanly. If not, protect existing work and follow local conventions.
2. **Before writing lots of code**, summarize a short first-sprint plan and any blocking licensing/data concerns. Proceed on nonblocking questions with conservative documented assumptions.
3. Keep each increment runnable; create small tested pieces rather than one enormous speculative implementation.
4. Check and respect current official technical and licensing docs when web access permits. Distinguish verified from unverified conclusions.
5. Preserve reproducibility: fixed seeds where applicable, source metadata, consistent data formats, meaningful logs, and regeneration scripts.
6. Test behavior with actual commands, not declarations. Report checks performed and outcomes.
7. At completion, summarize changed files, commands to run, data sources/rights status, what works, known gaps, and the **next smallest valuable task**.
8. Do not deploy, purchase services, connect accounts, publish private data, or push destructive repository changes without the owner's explicit authorization.

---

## 13. Ready-to-paste kickoff prompt for Codex

> I have created a GitHub repository named **Movieverse**. Read `MOVIEVERSE_CODEX_BRIEF.md` in the repository root as the authoritative vision, requirements, and roadmap. I want you to implement **Milestone 0 only**, not the entire roadmap.
>
> First inspect the repo and current tooling, then outline your plan and identify any significant license/data unknowns. Set up a clean React + TypeScript + Vite frontend and a Python data pipeline, create the architecture and data-source documentation, and build a working **mobile-first** dark cinematic movie-map prototype with pan, touch/pinch zoom, selectable movies, a detail view, search, and at least one real filter. Use only licensed/clearly labeled source data or a small transparent fixture; prioritize correctness over raw dataset size. Keep TV movies in scope. Avoid assuming access to restricted APIs, unauthorized scraping, accounts, or a backend.
>
> Implement this first vertical slice incrementally, run the actual tests/typecheck/build, and tell me exactly how to launch it locally. Document decisions, outstanding data licensing questions, and the next milestone. Keep the design extensible for large precomputed maps, multiple similarity lenses, and future local Letterboxd ZIP import. Do not deploy or perform destructive Git operations without asking.

