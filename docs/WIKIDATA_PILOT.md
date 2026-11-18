# Wikidata pilot

The first Milestone 1 release is a curated pilot of 71 films from 72 candidates, retrieved on November 18, 2026. The seed list deliberately mixes international releases, documentaries, animation, television films, and same-title releases. It includes one TV series as an exclusion check. This sample tests the pipeline and browsing experience. Its proportions cannot estimate coverage of the wider catalog.

| Check | Result |
| --- | --- |
| Wikidata IDs resolved | 72 of 72. All are distinct. |
| Included / held | 71 films included. The Last of Us is held as a TV series. |
| Release year | Every included seed year is supported by a non-deprecated P577 statement with year precision or better. 42 films list publication dates in multiple years. |
| Television films | 5 have direct TV film classification. 3 TV candidates have generic film classification and are flagged for review. |
| Genre grouping | 68 matched a pilot category. Duel, Brian's Song and The Night Stalker appear in Unmapped. |
| Title collisions | 4 same-title pairs remain separate, including Solaris (1972/2002) and The Thing (1982/2011). |
| Country and title variants | 71 films have country claims. 38 films have alternate titles indexed for search. |

## How evidence is used

- Resolve curated article names to Wikidata IDs via Wikimedia's page properties API. Fetch selected structured Wikidata evidence by ID. The snapshot contains no article text, images, or ratings.
- Use the English or language-independent label, falling back to an English title statement. Search also indexes English aliases and additional titles reported in P1476.
- Use the curated candidate year only when it matches a Wikidata publication-date statement. The report retains all reported years and identifies matching statement IDs. Territory, festival, broadcast, and reissue qualifiers can affect interpretation. The chosen year is a display year, with no claim of a single global release date.
- Include records whose P31 type matches a supported film class. Label a film as a TV movie only when Wikidata explicitly lists that type. The Day After, Duel, and Behind the Candelabra are flagged because their snapshot lists the generic film type.
- The group order is Animation, Documentary, Science fiction, then Drama. Films can match multiple filters. Only the first matched group controls placement. Documentary and animation can be both genre and form here. Positions and distances do not represent similarity.

Inspect [candidate decisions](../data/wikidata-pilot/audit.json), [pinned source evidence](../data/wikidata-pilot/snapshot.json), and [rebuild commands](../data/README.md). The next data pass should review ambiguous dates and TV classifications and broaden the genre mapping before growing the catalog.

Sources include [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access), [licensing](https://www.wikidata.org/wiki/Wikidata:Licensing), [publication date (P577)](https://www.wikidata.org/wiki/Property:P577), and [Wikimedia API etiquette](https://www.mediawiki.org/wiki/API:Etiquette).
