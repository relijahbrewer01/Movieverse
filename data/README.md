# Data

From the repo root, run `python -m pipeline.src.pilot` to rebuild the local SQLite database at `data/build/movieverse.sqlite3` and export the tracked `sample/` artifacts and `wikidata-pilot/audit.json` offline. The inputs are the pinned `wikidata-pilot/snapshot.json`, `wikidata-pilot/expansion.json`, and `wikidata-pilot/coverage.json` evidence plus the `wikidata-pilot/format-reviews.json` editorial decisions. Use `--snapshot` one or more times to choose different pinned batches, and `--database`, `--output`, and `--report` to write a separate copy. The first batch containing a QID supplies its evidence and retrieval date. A later batch cannot silently replace that record. The manifest records the catalog revision, count, projection version, and asset names.

To refresh evidence, run `python -m pipeline.src.wikidata --refresh` for the first batch. For later batches, specify both the seed file and output path, for example `python -m pipeline.src.wikidata --refresh --seeds pipeline/fixtures/wikidata-coverage.txt --output data/wikidata-pilot/coverage.json`. Rebuild the pilot and review changed findings before publishing. These optional commands use the official Wikimedia APIs and change pinned source data. Run `pnpm build:standalone` in `web/` after changing the pilot. The generated root `index.html` is excluded from Prettier so it stays reproducible.

The pilot uses [Wikidata structured data under CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Run `python -m pipeline.src.catalog` to generate the original fictional fixtures separately under ignored `data/demo/`. Those fixtures and their outputs are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) to the extent permitted by law. Keep credentials, private exports, and raw external dumps out of Git.

## SQLite catalog

The database stores films with their existing Movieverse IDs, unique Wikidata IDs, aliases, genre and country tags, publication years, source revisions and claims, and the decisions for included and held candidates. The [schema](../pipeline/src/catalog_schema.sql) and inputs are tracked. The generated database under `data/build/` is ignored by Git and can be rebuilt. The `pipeline/fixtures/wikidata-*.txt` files select candidates for a future evidence refresh. The app still reads the static JSON export or the copy embedded in the standalone HTML.

Inspect the built database or re-export from it without reading the pinned input files:

```sh
python -m sqlite3 data/build/movieverse.sqlite3 "SELECT format, COUNT(*) FROM films GROUP BY format;"
python -m pipeline.src.pilot --from-database
```

Rebuilding replaces the database only after all inserts and foreign-key checks succeed. Record editorial changes in the pinned inputs so they survive a rebuild.
