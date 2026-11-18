# Data

From the repo root, run `python -m pipeline.src.pilot` to rebuild the tracked `sample/` artifacts and `wikidata-pilot/audit.json` offline. The inputs are the pinned `wikidata-pilot/snapshot.json` evidence and `wikidata-pilot/format-reviews.json` editorial decisions. Use `--output` and `--report` to write a separate copy. The manifest records the catalog revision, count, projection version, and asset names.

To refresh evidence, run `python -m pipeline.src.wikidata --refresh`, rebuild the pilot, and review any changed findings before publishing. This optional command uses the official Wikimedia APIs and changes the pinned source. Run `pnpm build:standalone` in `web/` after changing the pilot.

The pilot uses [Wikidata structured data under CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Run `python -m pipeline.src.catalog` to generate the original fictional fixtures separately under ignored `data/demo/`. Those fixtures and their outputs are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) to the extent permitted by law. Keep credentials, private exports, and raw external dumps out of Git.

## Database migration

`pipeline/fixtures/wikidata-candidates.txt` selects titles to audit. The pinned snapshot and reviewed decisions feed the generated browser catalog. As imports grow beyond hand-selected batches, move candidate tracking, canonical films, source statements, and editorial reviews into a build-time SQLite database. Keep existing Movieverse IDs and enforce uniqueness for each source ID. Track database schema and import scripts in Git, and rebuild the database from pinned inputs. Continue exporting versioned JSON and the standalone preview so VS Code and static hosting can serve the atlas without a database connection.
