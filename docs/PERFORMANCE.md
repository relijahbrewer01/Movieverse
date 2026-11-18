# Atlas performance

From `web/`, build and run the local benchmark:

```sh
pnpm build
pnpm exec playwright install chromium
pnpm benchmark
```

Use `pnpm benchmark --actual-only` to skip the stress fixture. The default runs the published 255-film catalog and a synthetic 5,000-record case. The fixture duplicates existing metadata and slightly offsets coordinates to exercise denser rendering. It is intercepted in the test browser and never written to the catalog or the standalone preview.

Use `pnpm benchmark --diagnostics` to compare the throttled mobile stress case with and without canvas drawing. The diagnostic leaves the map controls and results list mounted in both cases.

Each line is the median of three fresh browser contexts. The desktop profile uses Playwright's Desktop Chrome preset. The mobile profile uses the Pixel 7 viewport, touch gestures, and Chromium's four-times CPU throttle.

- **Ready** measures from navigation until the full result count shows and the map has had time to paint.
- **Search** measures from submitting a narrow title/year query until the matching result and map have painted.
- **Pan p95** measures the 95th percentile of intervals between animation frames during a 30-step drag.
- **Data size** is the uncompressed sum of the manifest, catalog, and geometry JSON.
- **Mounted rows** counts the film list elements present before searching, including rows below the scroll area.

This runs on a local server with no network throttling. It includes browser-driver overhead, and the mobile profile does not measure a physical phone, its GPU, or real network latency. The numbers provide a comparison point for future changes in the same environment.

## Initial baseline

November 18, 2026, Windows, Node 24.22.1, Chromium 149.0.7827.55. Times are in milliseconds.

| Catalog | Profile | Ready | Search | Pan p95 | Data size |
| --- | --- | ---: | ---: | ---: | ---: |
| 255 real films | Desktop | 209.3 | 59.7 | 16.7 | 103 KiB |
| 255 real films | Throttled mobile | 1043.3 | 112.5 | 16.8 | 103 KiB |
| 5,000 synthetic records | Desktop | 591.6 | 160.5 | 16.8 | 2184 KiB |
| 5,000 synthetic records | Throttled mobile | 3226.1 | 526.4 | 116.5 | 2184 KiB |

At the pilot size, pan intervals stayed near one 60 Hz frame in both profiles. The dense fixture had longer loading and search times and visible risk of stutter in the throttled mobile profile.

## Dense-view optimization

The follow-up diagnostic held the result list steady while bypassing canvas drawing. The large drop in pan intervals isolated the slowdown to drawing; mounting 5,000 rows was a separate cost.

| Throttled mobile, 5,000 synthetic records | Ready | Search | Pan p95 | Mounted rows |
| --- | ---: | ---: | ---: | ---: |
| Before changes | 3096.5 | 474.4 | 133.4 | 5000 |
| Before changes, canvas bypassed | 2823.2 | 348.0 | 16.7 | 5000 |
| After changes | 1466.5 | 145.9 | 33.3 | 50 |

The canvas now batches markers by genre and calculates label bounds when filters change. With more than 1,000 matching films, each seven-pixel cell draws at most one ordinary marker per genre. Picking uses the same visible markers, and a selected film draws at its exact location. Zooming can separate nearby points. The results rail pages over the entire filtered catalog in sets of 50.

In separate `--actual-only` runs of the old and new 255-film builds on the same machine, median desktop readiness was 250.7 ms before and 257.5 ms after. Throttled mobile readiness was 1094.2 ms before and 1438.0 ms after. Mobile pan p95 was 33.3 ms before and 16.8 ms after in these reruns. The initial baseline also recorded 16.8 ms mobile p95. The change improved dense browsing, but the published-size startup measurement did not improve.

The benchmark still downloads or supplies the complete catalog and projects all matches. It does not simulate a large real release or a physical phone. Next, measure on actual mobile hardware and profile data loading and spatial indexing before targeting tens of thousands of films.
