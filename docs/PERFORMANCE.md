# Atlas performance

From `web/`, build and run the local benchmark:

```sh
pnpm build
pnpm exec playwright install chromium
pnpm benchmark
```

Use `pnpm benchmark --actual-only` to skip the stress fixture. The default runs the published 255-film catalog and a synthetic 5,000-record case. The fixture duplicates existing metadata and slightly offsets coordinates to exercise denser rendering. It is intercepted in the test browser and never written to the catalog or the standalone preview.

Each line is the median of three fresh browser contexts. The desktop profile uses Playwright's Desktop Chrome preset. The mobile profile uses the Pixel 7 viewport, touch gestures, and Chromium's four-times CPU throttle.

- **Ready** measures from navigation until the full result count shows and the map has had time to paint.
- **Search** measures from submitting a narrow title/year query until the matching result and map have painted.
- **Pan p95** measures the 95th percentile of intervals between animation frames during a 30-step drag.
- **Data size** is the uncompressed sum of the manifest, catalog, and geometry JSON.

This runs on a local server with no network throttling. It includes browser-driver overhead, and the mobile profile does not measure a physical phone, its GPU, or real network latency. The numbers provide a comparison point for future changes in the same environment.

## Initial baseline

November 18, 2026, Windows, Node 24.22.1, Chromium 149.0.7827.55. Times are in milliseconds.

| Catalog | Profile | Ready | Search | Pan p95 | Data size |
| --- | --- | ---: | ---: | ---: | ---: |
| 255 real films | Desktop | 209.3 | 59.7 | 16.7 | 103 KiB |
| 255 real films | Throttled mobile | 1043.3 | 112.5 | 16.8 | 103 KiB |
| 5,000 synthetic records | Desktop | 591.6 | 160.5 | 16.8 | 2184 KiB |
| 5,000 synthetic records | Throttled mobile | 3226.1 | 526.4 | 116.5 | 2184 KiB |

At the pilot size, pan intervals stayed near one 60 Hz frame in both profiles. The dense fixture had longer loading and search times and visible risk of stutter in the throttled mobile profile. Profile canvas drawing and result-list rendering separately before increasing the published catalog substantially. Re-run the same workload after changes to verify the effect.
