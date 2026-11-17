# Movie data model

The fixture adapter assigns explicit, stable IDs in a demo namespace. A record has ID, title, nullable release year, ordered genre tags, a fixture display format, and record-level provenance. Primary genre means the first tag only. A null year denotes unknown. Same-title records remain distinct. The simplified Feature/TV movie display format is fixture vocabulary.

For real films, assign durable internal IDs through a persisted identity registry. Store namespaced external IDs with evidence; retain distinct works even if title and year match. Use curated aliases, original titles, typed classification and distribution, precision on release dates, credits with roles, runtime, languages and countries. Distinguish unknown from confirmed absence. Keep competing claims with source URL/statement identifier, retrieval date, rights, and verification status. Investigate ID conflicts and ambiguous title/year matches before merging. Record decisions and keep redirects for retired IDs.

Keep optional licensed media/text in separate asset records with explicit rights and attribution. Keep geometry, cluster and neighbor lists in derived releases. User import matching uses verified source IDs first, then conservative title/year/alias candidates with manual review for ambiguities.
