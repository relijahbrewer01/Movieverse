# Milestone 0 decisions

- Use original fictional fixtures. The project can exercise TV films, duplicate titles and unknown dates without implying that production metadata was vetted. The dataset is dedicated to CC0.
- Use Canvas 2D for sample markers and a semantic DOM film list. The separation lets us change the point renderer independently of accessible selection. Use an in-flow details card on touch screens to keep gestures and focus handling simple.
- Generate the catalog, layout and manifest with Python's standard library. Identical input and projection generate byte-identical artifacts. The schema and adapter/projection boundaries make future releases and alternative algorithms explicit.
- Use static hosting as the delivery model, with GitHub Pages proposed for later approval. The current app does not require accounts or a runtime Python server.

Open questions for the catalog audit: How will Wikidata release dates be disambiguated by territory? Which classifications provide reliable TV-film and animation coverage across languages? What evidence and completeness thresholds justify publication? Which device and network should serve as the performance baseline?
